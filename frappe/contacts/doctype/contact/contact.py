# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# License: GNU General Public License v3. See license.txt

from __future__ import unicode_literals
import frappe
from frappe.utils import cstr, has_gravatar
from frappe import _
from frappe.model.document import Document
from frappe.core.doctype.dynamic_link.dynamic_link import deduplicate_dynamic_links
from six import iteritems
from past.builtins import cmp
from frappe.model.naming import append_number_if_name_exists
from frappe.contacts.address_and_contact import set_link_title

import functools

class Contact(Document):
	def autoname(self):
		# concat first and last name
		self.name = " ".join(filter(None,
			[cstr(self.get(f)).strip() for f in ["first_name", "last_name"]]))

		if frappe.db.exists("Contact", self.name):
			self.name = append_number_if_name_exists('Contact', self.name)

		# concat party name if reqd
		for link in self.links:
			self.name = self.name + '-' + link.link_name.strip()
			break

	def validate(self):
		self.set_primary_email()
		self.set_primary_phone_numbers()

		self.set_user()

		set_link_title(self)

		if self.email_id and not self.image:
			self.image = has_gravatar(self.email_id)

		if self.get("sync_with_google_contacts") and not self.get("google_contacts"):
			frappe.throw(_("Select Google Contacts to which contact should be synced."))

		deduplicate_dynamic_links(self)

	def set_user(self):
		if not self.user and self.email_id:
			self.user = frappe.db.get_value("User", {"email": self.email_id})

	def get_link_for(self, link_doctype):
		'''Return the link name, if exists for the given link DocType'''
		for link in self.links:
			if link.link_doctype==link_doctype:
				return link.link_name

		return None

	def has_link(self, doctype, name):
		for link in self.links:
			if link.link_doctype==doctype and link.link_name== name:
				return True

	def has_common_link(self, doc):
		reference_links = [(link.link_doctype, link.link_name) for link in doc.links]
		for link in self.links:
			if (link.link_doctype, link.link_name) in reference_links:
				return True

	def add_email(self, email_id, is_primary=0, autosave=False):
		self.append("email_ids", {
			"email_id": email_id,
			"is_primary": is_primary
		})

		if autosave:
			self.save(ignore_permissions=True)

	def add_phone(self, phone, phone_type="Phone", is_primary=0, autosave=False):
		self.append("phone_nos", {
			"phone": phone,
			"type": phone_type,
			"is_primary": is_primary
		})

		if autosave:
			self.save(ignore_permissions=True)

	def set_primary_email(self):
		if not self.email_ids:
			self.email_id = ""
			return

		is_primary = None

		for d in self.email_ids:
			if d.is_primary:
				if is_primary:
					frappe.throw(_("Only one {0} can be set as primary.").format(frappe.bold("Email ID")))

				is_primary = d.email_id.strip()
				self.email_id = d.email_id.strip()

	def set_primary_phone_numbers(self):
		# Used to set primary mobile, phone no, fax, skype, pager.
		for number_type in get_phone_number_types():
			if not number_type:
				continue

			is_primary = None
			for phone in self.phone_nos:
				if phone.type == number_type and phone.is_primary:
					if is_primary:
						frappe.throw(_("Only one {0} can be set as primary.").format(frappe.bold(number_type)))

					is_primary = phone.phone

			setattr(self, frappe.scrub(number_type), is_primary)

def get_default_contact(doctype, name):
	'''Returns default contact for the given doctype, name'''
	out = frappe.db.sql('''select parent,
			(select is_primary_contact from tabContact c where c.name = dl.parent)
				as is_primary_contact
		from
			`tabDynamic Link` dl
		where
			dl.link_doctype=%s and
			dl.link_name=%s and
			dl.parenttype = "Contact"''', (doctype, name))

	if out:
		return sorted(out, key = functools.cmp_to_key(lambda x,y: cmp(y[1], x[1])))[0][0]
	else:
		return None

@frappe.whitelist()
def invite_user(contact):
	contact = frappe.get_doc("Contact", contact)

	if not contact.email_id:
		frappe.throw(_("Please set Email Address"))

	if contact.has_permission("write"):
		user = frappe.get_doc({
			"doctype": "User",
			"first_name": contact.first_name,
			"last_name": contact.last_name,
			"email": contact.email_id,
			"user_type": "Website User",
			"send_welcome_email": 1
		}).insert(ignore_permissions = True)

		return user.name

@frappe.whitelist()
def get_contact_details(contact):
	contact = frappe.get_doc("Contact", contact)
	out = {
		"contact_person": contact.get("name"),
		"contact_display": " ".join(filter(None,
			[contact.get("salutation"), contact.get("first_name"), contact.get("last_name")])),
		"contact_email": contact.get("email_id"),
		"contact_mobile": contact.get("mobile_no"),
		"contact_phone": contact.get("phone"),
		"contact_designation": contact.get("designation"),
		"contact_department": contact.get("department")
	}
	return out

def update_contact(doc, method):
	'''Update contact when user is updated, if contact is found. Called via hooks'''
	contact_name = frappe.db.get_value("Contact", {"email_id": doc.name})
	if contact_name:
		contact = frappe.get_doc("Contact", contact_name)
		for key in ("first_name", "last_name", "phone"):
			if doc.get(key):
				contact.set(key, doc.get(key))
		contact.flags.ignore_mandatory = True
		contact.save(ignore_permissions=True)

def contact_query(doctype, txt, searchfield, start, page_len, filters):
	from frappe.desk.reportview import get_match_cond

	link_doctype = filters.pop('link_doctype')
	link_name = filters.pop('link_name')

	condition = ""
	for fieldname, value in iteritems(filters):
		condition += " and {field}={value}".format(
			field=fieldname,
			value=value
		)

	return frappe.db.sql("""select
			`tabContact`.name, `tabContact`.first_name, `tabContact`.last_name
		from
			`tabContact`, `tabDynamic Link`
		where
			`tabDynamic Link`.parent = `tabContact`.name and
			`tabDynamic Link`.parenttype = 'Contact' and
			`tabDynamic Link`.link_doctype = %(link_doctype)s and
			`tabDynamic Link`.link_name = %(link_name)s and
			`tabContact`.`{key}` like %(txt)s
			{mcond}
		order by
			if(locate(%(_txt)s, `tabContact`.name), locate(%(_txt)s, `tabContact`.name), 99999),
			`tabContact`.idx desc, `tabContact`.name
		limit %(start)s, %(page_len)s """.format(
			mcond=get_match_cond(doctype),
			key=searchfield), {
			'txt': '%' + txt + '%',
			'_txt': txt.replace("%", ""),
			'start': start,
			'page_len': page_len,
			'link_name': link_name,
			'link_doctype': link_doctype
		})

@frappe.whitelist()
def address_query(links):
	import json

	links = [{"link_doctype": d.get("link_doctype"), "link_name": d.get("link_name")} for d in json.loads(links)]
	result = []

	for link in links:
		if not frappe.has_permission(doctype=link.get("link_doctype"), ptype="read", doc=link.get("link_name")):
			continue

		res = frappe.db.sql("""
			SELECT `tabAddress`.name
			FROM `tabAddress`, `tabDynamic Link`
			WHERE `tabDynamic Link`.parenttype='Address'
				AND `tabDynamic Link`.parent=`tabAddress`.name
				AND `tabDynamic Link`.link_doctype = %(link_doctype)s
				AND `tabDynamic Link`.link_name = %(link_name)s
		""", {
			"link_doctype": link.get("link_doctype"),
			"link_name": link.get("link_name"),
		}, as_dict=True)

		result.extend([l.name for l in res])

	return result

def get_contact_with_phone_number(number):
	if not number: return

	contacts = frappe.get_all('Contact Phone', filters=[
		['phone', 'like', '%{0}'.format(number)]
	], fields=["parent"], limit=1)

	return contacts[0].parent if contacts else None

def get_contact_name(email_id):
	contact = frappe.get_list("Contact Email", filters={"email_id": email_id}, fields=["parent"], limit=1)
	return contact[0].parent if contact else None

def get_phone_number_types():
	meta = frappe.get_meta("Contact Phone")
	return set(meta.get_field("type").options.split("\n"))

def get_phone_nos_for_onload(name):
	contact_phones = frappe.get_list("Contact Phone", filters={
		"parenttype": "Contact",
		"parent": name,
	}, fields=["type", "phone", "is_primary"])

	contacts = []
	for number_type in get_phone_number_types():
		numbers = []

		for contact in contact_phones:
			if not contact.type == number_type:
				continue

			if contact.is_primary:
				numbers.insert(0, {"number": contact.phone, "is_primary": 1})
			else:
				numbers.append({"number": contact.phone, "is_primary": 0})

		contacts.append({
			"type": number_type,
			"numbers": numbers
		})

	return contacts