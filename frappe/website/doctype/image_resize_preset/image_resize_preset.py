# -*- coding: utf-8 -*-
# Copyright (c) 2020, Frappe Technologies and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document

class ImageResizePreset(Document):
	def clear_cache(self):
		frappe.cache().delete_keys("base64_image_cache|{}|*".format(self.name))
		frappe.cache().delete_keys("thumbnail_cache|{}|*".format(self.name))