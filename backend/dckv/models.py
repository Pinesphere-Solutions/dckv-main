from django.db import models

class DeviceReading(models.Model):
    # meta fields to identify device and context
    hotel_id = models.IntegerField()      # D1
    kitchen_id = models.IntegerField()    # D2
    date = models.DateField()             # D3 (date part)
    start_time = models.TimeField()       # D4
    end_time = models.TimeField()         # D5
    mid_hid = models.IntegerField()       # D6 (master or hood id)
    temperature = models.FloatField(null=True, blank=True)      # D7
    smoke = models.FloatField(null=True, blank=True)            # D8
    damper_pos = models.FloatField(null=True, blank=True)       # D9
    exhaust_speed = models.FloatField(null=True, blank=True)    # D10
    mains_voltage = models.FloatField(null=True, blank=True)    # D11
    energy_cum = models.FloatField(null=True, blank=True)       # D12 cumulative kWh
    log_id = models.IntegerField(null=True, blank=True)         # D13
    energy_interval = models.FloatField(null=True, blank=True)     # D14 (kWh per interval)
    interval_minutes = models.FloatField(null=True, blank=True)    # D15 (duration in minutes)

    # stored derived datetime for sorting
    datetime_end = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["mid_hid", "date", "datetime_end"]),
        ]
        ordering = ["datetime_end"]

    def __str__(self):
        return f"{self.mid_hid} {self.date} {self.end_time}"
    


class Benchmark(models.Model):
    hotel_id = models.IntegerField()
    kitchen_id = models.IntegerField()
    date = models.DateField()
    value_units_per_hour = models.FloatField()  # numeric only
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("hotel_id", "kitchen_id", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"BM {self.hotel_id}-{self.kitchen_id}-{self.date}={self.value_units_per_hour}"



