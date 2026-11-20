"""
apps/core/tests.py
------------------
End-to-end API & business-logic test suite.
"""

from datetime import date, time, datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.employees.models import Employee, Schedule
from apps.services.models import Service
from apps.appointments.models import Appointment, Payment
from apps.reviews.models import Review

User = get_user_model()


class HazemCoiffEndToEndTests(TestCase):
    def setUp(self):
        self.client_api = APIClient()

        self.admin = User.objects.create_user(
            email="admin@test.tn",
            password="Password123!",
            full_name="Admin User",
            role="admin",
        )
        self.barber_user = User.objects.create_user(
            email="barber@test.tn",
            password="Password123!",
            full_name="Aziz Barber",
            role="barber",
        )
        self.customer = User.objects.create_user(
            email="client@test.tn",
            password="Password123!",
            full_name="Ahmed Client",
            phone="+21620000000",
            role="client",
        )

        self.employee = Employee.objects.create(
            user=self.barber_user,
            specialties="fades, beard",
            years_experience=5,
        )

        for day in range(7):
            Schedule.objects.create(
                employee=self.employee,
                day_of_week=day,
                start_time=time(9, 0),
                end_time=time(17, 0),
            )

        self.service = Service.objects.create(
            name="Classic Cut",
            category="Hair",
            price=Decimal("15.00"),
            duration_minutes=30,
        )

    def _auth(self, user):
        self.client_api.force_authenticate(user=user)

    def test_profile_get_and_patch(self):
        self._auth(self.customer)
        res = self.client_api.get("/api/auth/me/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["user"]["email"], "client@test.tn")

        patch_res = self.client_api.patch(
            "/api/auth/me/",
            {"full_name": "Ahmed Updated", "phone": "+21699111222"},
            format="json",
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.data["data"]["user"]["full_name"], "Ahmed Updated")
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.full_name, "Ahmed Updated")

    def test_admin_can_list_barber_users(self):
        self._auth(self.admin)
        res = self.client_api.get("/api/auth/users/?role=barber")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["data"]), 1)
        self.assertEqual(res.data["data"][0]["email"], "barber@test.tn")

    def test_service_deactivate_and_reactivate(self):
        self._auth(self.admin)
        del_res = self.client_api.delete(f"/api/services/{self.service.id}/")
        self.assertEqual(del_res.status_code, 204)
        self.service.refresh_from_db()
        self.assertFalse(self.service.is_active)

        patch_res = self.client_api.patch(
            f"/api/services/{self.service.id}/",
            {"is_active": True},
            format="json",
        )
        self.assertEqual(patch_res.status_code, 200)
        self.service.refresh_from_db()
        self.assertTrue(self.service.is_active)

    def test_availability_and_atomic_booking_prevents_double_book(self):
        tomorrow = date.today() + timedelta(days=1)
        self._auth(self.customer)

        avail_res = self.client_api.get(
            f"/api/availability/?employee={self.employee.id}&date={tomorrow.isoformat()}&service={self.service.id}"
        )
        self.assertEqual(avail_res.status_code, 200)
        slots = avail_res.data["data"]["slots"]
        self.assertGreater(len(slots), 0)

        chosen_slot = slots[0]
        book_res = self.client_api.post(
            "/api/appointments/",
            {
                "employee_id": str(self.employee.id),
                "service_id": str(self.service.id),
                "start_time": chosen_slot,
                "notes": "Fade on sides",
            },
            format="json",
        )
        self.assertEqual(book_res.status_code, 201)
        appt_data = book_res.data["data"]
        self.assertEqual(appt_data["service_price"], "15.00")
        self.assertEqual(appt_data["payment_amount"], "15.00")

        dup_res = self.client_api.post(
            "/api/appointments/",
            {
                "employee_id": str(self.employee.id),
                "service_id": str(self.service.id),
                "start_time": chosen_slot,
            },
            format="json",
        )
        self.assertEqual(dup_res.status_code, 400)

    def test_barber_workflow_and_payment_and_review(self):
        tomorrow = date.today() + timedelta(days=2)
        start = timezone.make_aware(datetime.combine(tomorrow, time(10, 0)))
        appt = Appointment.objects.create(
            client=self.customer,
            employee=self.employee,
            service=self.service,
            start_time=start,
            end_time=start + timedelta(minutes=30),
            status=Appointment.Status.PENDING,
        )
        Payment.objects.create(appointment=appt, amount=self.service.price)

        self._auth(self.barber_user)
        r1 = self.client_api.post(f"/api/appointments/{appt.id}/status/", {"status": "confirmed"}, format="json")
        self.assertEqual(r1.status_code, 200)

        r2 = self.client_api.post(f"/api/appointments/{appt.id}/status/", {"status": "arrived"}, format="json")
        self.assertEqual(r2.status_code, 200)
        r3 = self.client_api.post(f"/api/appointments/{appt.id}/status/", {"status": "completed"}, format="json")
        self.assertEqual(r3.status_code, 200)

        self._auth(self.admin)
        pay_res = self.client_api.patch(
            f"/api/appointments/{appt.id}/payment/",
            {"status": "paid", "method": "cash"},
            format="json",
        )
        self.assertEqual(pay_res.status_code, 200)
        self.assertEqual(pay_res.data["data"]["payment_status"], "paid")

        self._auth(self.customer)
        rev_res = self.client_api.post(
            "/api/reviews/",
            {"appointment_id": str(appt.id), "rating": 5, "comment": "Top service"},
            format="json",
        )
        self.assertEqual(rev_res.status_code, 201)
        self.assertEqual(Review.objects.count(), 1)
