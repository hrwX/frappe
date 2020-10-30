frappe.ui.form.ControlDatetime = frappe.ui.form.ControlDate.extend({
	set_date_options: function() {
		this._super();
		this.today_text = __("Now");
		this.date_format = frappe.defaultDatetimeFormat;
		$.extend(this.datepicker_options, {
			timepicker: true,
			timeFormat: "hh:ii:ss"
		});
	},
	get_now_date: function() {
		return frappe.datetime.now_datetime(true);
	},
	set_description: function() {
		this.df.description = frappe.user_defaults.time_zone;
		this._super();
	},
	set_formatted_input(value) {
		value = frappe.datetime.convert_to_user_tz(value, true);
		this.$input && this.$input.val(this.format_for_input(value));
		this.format_for_datepicker(value);
	},
	format_for_datepicker: function(value) {
		if (!this.datepicker) return;
		if(!value) {
			this.datepicker.clear();
			return;
		}

		let should_refresh = this.last_value && this.last_value !== value;

		if (!should_refresh) {
			if(this.datepicker.selectedDates.length > 0) {
				// if date is selected but different from value, refresh
				const selected_date =
					moment(this.datepicker.selectedDates[0])
						.format(this.date_format);

				should_refresh = selected_date !== value;
			} else {
				// if datepicker has no selected date, refresh
				should_refresh = true;
			}
		}

		if(should_refresh) {
			this.datepicker.selectDate(moment(value).format(frappe.defaultDatetimeFormat || "YYYY-MM-DD HH:mm:ss"));
		}
	}
});
