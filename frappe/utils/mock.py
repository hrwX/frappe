from frappe.model.document import Document
from frappe.model.meta import Meta

def mock_field(**kwargs):
	"""Creats a mock field definition. Used during unittesting to reduce framework calls and
	only test the smallest unit of work required.
	
	Params:
		kwargs: dict -> All fields you need to test against. Refer to doctype json file definitions.

	Returns:
		A dict containing meta information of this field.
	"""

	meta = {
		"doctype": "DocField",
		"owner": "Administrator",
		"modified_by": "Administrator",
		"parentfield": "fields",
		"parenttype": "DocType"
	}

	if kwargs and len(kwargs) > 0:
		meta.update(kwargs)

	return meta

def mock_meta(doctype, fields):
	"""Creates a mock metadata for a given doctype. Used during unittesting to reduce framework calls and
	only test the smallest unit of work required.'
	
	Params:
		doctype: string -> The doctype to mock.
		fields: list -> A list of dict defining individual fields. Only define what you are testing against.

	Returns:
		A Meta instance defining our mock doctype
	"""

	return Meta({
		"doctype": "DocType",
		"name": doctype,
		"parent": None,
		"parentfield": None,
		"parenttype": None,
		"document_type": "Document",
		"fields": [ mock_field(doctype=doctype, **field) for field in fields ]
	})

def build_get_meta_side_effects(metas):
	"""Returns a mock side effects method to be used as a side effect for the purpose of unit testing.
	This method replaces doctype metas for user defined ones. The returned method should be passed 
	to a unittest.mock.MagicMock instance via patch or mock. This prevents database calls and enforces
	unit test isolation.
	
	Params:
		metas: list -> A list of Meta instances created with mock_meta()

	Example:
		@patch('frappe.get_doc')
		@patch('frappe.get_meta')
		def test_fetch_quotation(self, get_meta, get_doc):
			# Mock Quotation
			get_doc.side_effect = [Document({
				"doctype": "Quotation",
				"name": "test-quotation", 
				"customer_name": "test-customer"
			})]

			# Mock Quotation Metadata. Notice the limited set of fields.
			get_meta.side_effect = build_get_meta_side_effects(
				mock_meta("Quotation", fields=[
					{ "fieldname": "name", "fieldtype": "Data" },
					{ "fieldname": "customer_name", "fieldtype": "Link", "options": "Customer" }
				])
			)

			# Fetches the mocked quotation
			doc = frappe.get_doc("Quotation", "test-quotation")

			# Then perform your tests
			get_doc.assert_called()
			get_meta.assert_called()
			self.assertTrue(doc.customer == "test-customer")
	"""

	def side_effect(doctype, cached=False):
		for meta in metas:
			if meta.name == doctype:
				return meta

		raise Exception("Unexpected get_meta doctype: {}".format(doctype))
	
	return side_effect

def build_get_doc_side_effect(docs):
	"""Builds a side effect method to wrap frappe.get_doc method. This makes it
	convenient to store multiple mock documents during unittests"""

	def get_doc(doctype, name):
		for doc in docs:
			if doc.name == name:
				return doc

		raise Exception("Mock document not found: {}: {}".format(doctype, name))

	return get_doc
