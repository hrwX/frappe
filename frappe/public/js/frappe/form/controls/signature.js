frappe.ui.form.ControlSignature = frappe.ui.form.ControlData.extend({
	saving: false,
	loading: false,
	make: function() {
		var me = this;
		this._super();

		// make jSignature field
		this.body = $('<div class="signature-field"></div>').appendTo(me.wrapper);

		if (this.body.is(':visible')) {
			this.make_pad();
		} else {
			$(document).on('frappe.ui.Dialog:shown', () => {
				this.make_pad();
			});
		}

		this.img_wrapper = $(`<div class="signature-display">
			<div class="missing-image attach-missing-image">
				<i class="octicon octicon-circle-slash"></i>
			</div></div>`)
			.appendTo(this.wrapper);
		this.img = $("<img class='img-responsive attach-image-display'>")
			.appendTo(this.img_wrapper).toggle(false);

	},
	make_pad: function() {
		let width = this.body.width();
		if (width > 0 && !this.$pad) {
			this.$pad = this.body.jSignature({
				height: 300,
				width: this.body.width(),
				lineWidth: 3
			}).on('change',
				this.on_save_sign.bind(this));
			this.load_pad();
			this.$reset_button_wrapper = $(`<div class="signature-btn-row">
				<a href="#" type="button" class="signature-reset btn btn-default">
				<i class="glyphicon glyphicon-repeat"></i></a>`)
				.appendTo(this.$pad)
				.on("click", '.signature-reset', () => {
					this.on_reset_sign();
					return false;
				});

			this.$reset_attach_wrapper = $(`<div class="signature-attach-btn-row">
				<a href="#" type="button" class="signature-attach btn btn-default">
				<i class="glyphicon glyphicon-link"></i></a>`)
				.appendTo(this.$pad)
				.on("click", '.signature-attach', () => {
					this.make_attachments();
					return false;
				});

		}
	},
	make_attachments: function() {
		new frappe.ui.FileUploader(this.get_upload_options());
	},
	get_upload_options() {
		var me = this;
		let options = {
			allow_multiple: false,
			on_success: file => {
				me.on_upload_complete(file);
			}
		};

		if (this.frm && !this.frm.is_new()) {
			options.doctype = this.frm.doctype;
			options.docname = this.frm.docname;
			options.fieldname = this.df.fieldname;
		}

		if (this.df.options) {
			Object.assign(options, this.df.options);
		}
		return options;
	},
	on_upload_complete: function(attachment) {
		var me=this;
		if (this.frm) {
			this.frm.attachments.update_attachment(attachment);
			this.frm.doc.docstatus == 1 ? this.frm.save('Update') : this.frm.save();
		}
		frappe.call({
			method: "frappe.utils.image.image_to_base64",
			args: {
				path: attachment.file_url
			},
			callback: function (r) {
				me.set_my_value(r.message);
				me.set_image(me.get_value());
			}
		});
	},
	refresh_input: function(e) {
		// prevent to load the second time
		this.make_pad();
		this.$wrapper.find(".control-input").toggle(false);
		this.set_editable(this.get_status()=="Write");
		this.load_pad();
		if(this.get_status()=="Read") {
			$(this.disp_area).toggle(false);
		}
	},
	set_image: function(value) {
		if(value) {
			$(this.img_wrapper).find(".missing-image").toggle(false);
			this.img.attr("src", value).toggle(true);
		} else {
			$(this.img_wrapper).find(".missing-image").toggle(true);
			this.img.toggle(false);
		}
	},
	load_pad: function() {
		// make sure not triggered during saving
		if (this.saving) return;
		// get value
		var value = this.get_value();
		// import data for pad
		if (this.$pad) {
			this.loading = true;
			// reset in all cases
			this.$pad.jSignature('reset');
			if (value) {
				// load the image to find out the size, because scaling will affect
				// stroke width
				try {
					this.$pad.jSignature('setData', value);
					this.set_image(value);
				}
				catch (e){
					console.log("Cannot set data for signature", value, e);
				}
			}

			this.loading = false;
		}
	},
	set_editable: function(editable) {
		this.$pad && this.$pad.toggle(editable);
		this.img_wrapper.toggle(!editable);
		if (this.$reset_button_wrapper) {
			this.$reset_button_wrapper.toggle(editable);
			if (editable) {
				this.$reset_button_wrapper.addClass('editing');
				this.$reset_attach_wrapper.addClass('editing');
			}
			else {
				this.$reset_button_wrapper.removeClass('editing');
				this.$reset_attach_wrapper.addClass('editing');
			}
		}
	},
	set_my_value: function(value) {
		if (this.saving || this.loading) return;
		this.saving = true;
		this.set_value(value);
		this.saving = false;
	},
	get_value: function() {
		return this.value ? this.value: this.get_model_value();
	},
	// reset signature canvas
	on_reset_sign: function() {
		this.$pad.jSignature("reset");
		this.set_my_value("");
	},
	// save signature value to model and display
	on_save_sign: function() {
		if (this.saving || this.loading) return;
		var base64_img = this.$pad.jSignature("getData");
		this.set_my_value(base64_img);
		this.set_image(this.get_value());
	}
});
