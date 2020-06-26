frappe.provide('frappe.ui.form');

frappe.ui.form.ControlCheck = frappe.ui.form.ControlData.extend({
	input_type: "checkbox",
	make_wrapper: function() {
		this.$wrapper = $(`<div class="form-group frappe-control">
			<div class="checkbox">
				<label>
					<span class="input-area"></span>
					<span class="disp-area"></span>
					<span class="label-area ${this.df.is_web_form ? "" : "small"}"></span>
				</label>
				<p class="help-box small text-muted"></p>
			</div>
		</div>`).appendTo(this.parent);
	},
	set_input_areas: function() {
		this.label_area = this.label_span = this.$wrapper.find(".label-area").get(0);
		this.input_area = this.$wrapper.find(".input-area").get(0);
		this.disp_area = this.$wrapper.find(".disp-area").get(0);
	},
	make_input: function() {
		this._super();
		this.$input.removeClass("form-control");
	},
	get_input_value: function() {
		return this.input && this.input.checked ? 1 : 0;
	},
	validate: function(value) {
		return cint(value);
	},
	set_input: function(value) {
		value = cint(value);
		if(this.input) {
			this.input.checked = (value ? 1 : 0);
		}
		this.last_value = value;
		this.set_mandatory(value);
		this.set_disp_area(value);
	},
	customize: function() {
		if (this.$wrapper.find(".checkbox .frappe-control-settings").length) {
			return;
		}

		$(`<span class="text-muted pull-right frappe-control-settings" style="margin-bottom: 5px;">
				<i class="fa fa-gear "></i>
			</span>`).insertAfter(this.$wrapper.find('.checkbox label')).on('click', () => {
				frappe.ui.form.CustomizeField(this.df).then((df) => {
					this.df = df;

					for (let idx in this.frm.meta.fields) {
						let field = this.frm.meta.fields[idx];
						if (field.fieldname === df.fieldname) {
							$.extend(field, df);
						}
					}
				})
			});

		$(`<span class="text-muted pull-right frappe-control-sort" style="margin-bottom: 5px; padding-left: 15px;">
				<i class="fa fa-bars"></i>
			</span>`).insertAfter(this.$wrapper.find('.checkbox label'));
	}
});
