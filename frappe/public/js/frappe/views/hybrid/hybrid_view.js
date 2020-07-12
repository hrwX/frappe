frappe.provide('frappe.views');

frappe.views.HybridView = class HybridView extends frappe.views.ListView {
	get view_name() {
		return 'Hybrid List';
	}

	setup_defaults() {
		super.setup_defaults();
		this.view = 'Hybrid List';
		this.method = 'frappe.desk.reportview.get_hybrid_list';
		this.child_doctype = this.settings.hybrid.child_doctype;

		frappe.model.with_doctype(this.child_doctype, () => {
			this.child_meta = frappe.get_meta(this.child_doctype);
			this.child_fields = [];
		}, false);
	}

	get_child_fields() {
		// convert [fieldname, Doctype] => tabDoctype.fieldname
		return this.child_fields.map(f => frappe.model.get_full_column_name(f[0], f[1]));
	}

	setup_list_click() {
		this.$result.on('click', '.list-row-container', (e) => {
			let target = e.currentTarget.getAttribute("data-toggle");
			let el = $(`[data-idx="${target}"]`) && $(`[data-idx="${target}"]`)[0];

			if (el) {
				el.classList.toggle("hide")
			}
		});

		this.$result.on('click', '.btn-action', (e) => {
			let doctype = e.currentTarget.getAttribute("data-doctype");
			let name = e.currentTarget.getAttribute("data-name");
			frappe.set_route("Form", doctype, name);
		});
	}

	setup_fields() {
		super.setup_fields();
		this.set_child_fields();
		this.build_child_fields();
	}

	setup_view() {
		super.setup_view();
		this.setup_child_columns(frappe.meta.get_docfield.bind(null, this.child_doctype));
	}

	build_child_fields() {
		this.child_fields = this.child_fields.map(f => {
			if (typeof f === 'string') {
				f = [f, this.child_doctype];
			}
			return f;
		});
		// remove null or undefined values
		this.child_fields = this.child_fields.filter(Boolean);
		//de-duplicate
		this.child_fields = this.child_fields.uniqBy(f => f[0] + f[1]);
	}

	get_args() {
		const args = super.get_args();

		return {
			params: {
				parent: args,
				child: {
					doctype: this.child_doctype,
					fieldname: this.settings.hybrid.child_link_fieldname,
					fields: this.get_child_fields()
				}
			}
		}
	}

	setup_child_columns(get_df) {
		this.child_columns = [];

		// 1st column: title_field or name
		if (this.child_meta.title_field) {
			this.child_columns.push({
				type: 'Subject',
				df: get_df(this.child_meta.title_field)
			});
		} else {
			this.child_columns.push({
				type: 'Subject',
				df: {
					label: __('Name'),
					fieldname: 'name'
				}
			});
		}

		// 2nd column: Status indicator
		if (frappe.has_indicator(this.child_meta.name)) {
			// indicator
			this.child_columns.push({
				type: 'Status'
			});
		}

		const fields_in_list_view = this.get_child_fields_in_list_view();

		// Add rest from in_list_view docfields
		this.child_columns = this.child_columns.concat(fields_in_list_view.filter(df => {
			if (frappe.has_indicator(this.child_meta.name) && df.fieldname === 'status') {
				return false;
			}
			if (!df.in_list_view) {
				return false;
			}

			return df.fieldname !== this.meta.title_field;
		}).map(df => ({
			type: 'Field',
			df
		})));


		// limit max to 8 columns if no total_fields is set in List View Settings
		// Screen with low density no of columns 4
		// Screen with medium density no of columns 6
		// Screen with high density no of columns 8
		let total_fields = 6;

		if (window.innerWidth <= 1366) {
			total_fields = 4;
		} else if (window.innerWidth >= 1920) {
			total_fields = 8;
		}

		this.child_columns = this.child_columns.slice(0, total_fields);
	}

	set_child_fields() {
		let fields = [].concat(
			frappe.model.std_fields_list,
			this.get_child_fields_in_list_view(),
			[this.child_meta.title_field, this.child_meta.image_field],
			this.child_meta.track_seen ? '_seen' : null,
			'enabled',
			'disabled',
			'color'
		);

		fields.forEach(f => this._add_child_field(f));

		this.child_fields.forEach(f => {
			const df = frappe.meta.get_docfield(f[1], f[0]);
			if (df && df.fieldtype === 'Currency' && df.options && !df.options.includes(':')) {
				this._add_child_field(df.options);
			}
		});
	}

	_add_child_field(fieldname) {
		if (!fieldname) return;
		let doctype = this.child_doctype;

		if (typeof fieldname === 'object') {
			// df is passed
			const df = fieldname;
			fieldname = df.fieldname;
			doctype = df.parent;
		}

		const is_valid_field = frappe.model.std_fields_list.includes(fieldname)
			|| frappe.meta.has_field(doctype, fieldname)
			|| fieldname === '_seen';

		if (!is_valid_field) {
			return;
		}

		this.child_fields.push([fieldname, doctype]);
	}

	get_child_fields_in_list_view() {
		return this.child_meta.fields.filter(df => {
			return frappe.model.is_value_type(df.fieldtype) && (
				df.in_list_view
				&& frappe.perm.has_perm(this.doctype, df.permlevel, 'read')
			) || (
				df.fieldtype === 'Currency'
				&& df.options
				&& !df.options.includes(':')
			) || (
				df.fieldname === 'status'
			);
		});
	};

	get_list_row_html(doc) {
		let _nested = ``;

		if(doc.nested) {
			doc.nested.forEach(el => {
				el['doctype'] = this.child_doctype;
				el['is_nested'] = true;
				_nested += this.get_list_row_html_skeleton(this.get_left_html(this.child_columns, el), this.get_right_html(el));
			});
		}

		return this.get_list_row_html_skeleton(this.get_left_html(this.columns, doc), this.get_right_html(doc), doc._idx, _nested);
	}

	get_list_row_html_skeleton(left = '', right = '', _idx = null, child = null) {
		let _nested = ``;

		if (_idx) {
			_nested = `<div class="nested hide" tabindex="1" data-idx="${_idx}">
				${child}
			</div>`;
		}

		return `
			<div class="list-row-container" tabindex="1" data-toggle="${_idx}">
				<div class="level list-row small">
					<div class="level-left ellipsis">
						${left}
					</div>
					<div class="level-right text-muted ellipsis">
						${right}
					</div>
				</div>
			</div>
			${_nested}
		`;
	}

	get_subject_html(doc) {
		let user = frappe.session.user;
		let subject_field = this.columns[0].df;
		let value = doc[subject_field.fieldname] || doc.name;
		let subject = strip_html(value.toString());
		let escaped_subject = frappe.utils.escape_html(subject);

		const liked_by = JSON.parse(doc._liked_by || '[]');
		let heart_class = liked_by.includes(user) ?
			'liked-by' : 'text-extra-muted not-liked';

		const seen = JSON.parse(doc._seen || '[]')
			.includes(user) ? '' : 'bold';

		let subject_html = `
			<span class="level-item ${!doc.is_nested ? 'hide' : ''}" style="margin-bottom: 1px;">
			</span>
			<span class="level-item">
				<i class="${doc.nested && doc.nested.length ? 'octicon octicon-chevron-right' : ''}" />
			</span>
			<input class="level-item list-row-checkbox hidden-xs" type="checkbox" data-name="${escape(doc.name)}">
			<span class="level-item" style="margin-bottom: 1px;">
				<i class="octicon octicon-heart like-action ${heart_class}"
					data-name="${doc.name}" data-doctype="${doc.doctype}"
					data-liked-by="${encodeURI(doc._liked_by) || '[]'}"
				>
				</i>
				<span class="likes-count">
					${ liked_by.length > 99 ? __("99") + '+' : __(liked_by.length || '')}
				</span>
			</span>
			<span class="level-item ${seen} ellipsis" title="${escaped_subject}">
				<a class="ellipsis" href="${this.get_form_link(doc)}" title="${escaped_subject}" data-doctype="${doc.doctype}" data-name="${doc.name}">
				${subject}
				</a>
			</span>
		`;

		return subject_html;
	}

	get_left_html(cols, doc) {
		return cols.map(col => this.get_column_html(col, doc)).join('');
	}

	get_meta_html(doc) {
		let html = `
			<div class="level-item hidden-xs">
				<button class="btn btn-action btn-default btn-xs"
					data-doctype="${doc.doctype}" data-name="${doc.name}"
					title="Open">
					Open
				</a>
			</div>
		`;

		const modified = comment_when(doc.modified, true);

		const last_assignee = JSON.parse(doc._assign || '[]').slice(-1)[0];
		const assigned_to = last_assignee ?
			`<span class="filterable"
				data-filter="_assign,like,%${last_assignee}%">
				${frappe.avatar(last_assignee)}
			</span>` :
			`<span class="avatar avatar-small avatar-empty"></span>`;

		const comment_count =
			`<span class="${!doc._comment_count ? 'text-extra-muted' : ''} comment-count">
				<i class="octicon octicon-comment-discussion"></i>
				${doc._comment_count > 99 ? "99+" : doc._comment_count}
			</span>`;

		html += `
			<div class="level-item hidden-xs list-row-activity">
				${modified}
				${assigned_to}
				${comment_count}
			</div>
			<div class="level-item visible-xs text-right">
				${this.get_indicator_dot(doc)}
			</div>
		`;

		return html;
	}

	get_form_link(doc) {
		if (this.settings.get_form_link) {
			return this.settings.get_form_link(doc);
		}

		const docname = doc.name.match(/[%'"]/)
			? encodeURIComponent(doc.name)
			: doc.name;

		return '#Form/' + doc.doctype + '/' + docname;
	}
}