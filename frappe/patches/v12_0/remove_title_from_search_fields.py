import frappe

def execute():
	for property_setter in frappe.get_all("Property Setter", filters={"property": "search_fields"}):
		frappe.delete_doc_if_exists("Property Setter", property_setter.name)