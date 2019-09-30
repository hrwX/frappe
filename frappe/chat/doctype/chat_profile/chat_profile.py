from __future__ import unicode_literals

from frappe.model.document import Document
import frappe
from frappe import _

from frappe.core.doctype.version.version import get_diff
from frappe.chat.doctype.chat_room import chat_room
from frappe.chat.util import safe_json_loads, filter_dict, dictify

class ChatProfile(Document):
	pass
	# def on_update(self):
	# 	if not self.is_new():
	# 		b, a = self.get_doc_before_save(), self
	# 		diff = dictify(get_diff(a, b))
	# 		if diff:
	# 			user = session.user

	# 			fields = [changed[0] for changed in diff.changed]

	# 			if 'status' in fields:
	# 				rooms  = chat_room.get(user, filters = ['Chat Room', 'type', '=', 'Direct'])
	# 				update = dict(user = user, data = dict(status = self.status))

	# 				for room in rooms:
	# 					frappe.publish_realtime('frappe.chat.profile:update', update, room = room.name, after_commit = True)

	# 			if 'enable_chat' in fields:
	# 				update = dict(user = user, data = dict(enable_chat = bool(self.enable_chat)))
	# 				frappe.publish_realtime('frappe.chat.profile:update', update, user = user, after_commit = True)

@frappe.whitelist()
def get_chat_profile(user):
	user = frappe.get_doc('User', user)

	if frappe.db.exists('Chat Profile', user.name):
		chat_profile = frappe.get_doc('Chat Profile', user.name)

		profile = {
			"name": user.name,
			"email": user.email,
			"first_name": user.first_name,
			"last_name": user.last_name,
			"username": user.username,
			"avatar": user.user_image,
			"bio": user.bio,
			"status": chat_profile.status,
			"chat_background": chat_profile.chat_background,
			"message_preview": bool(chat_profile.message_preview),
			"notification_tones": bool(chat_profile.notification_tones),
			"conversation_tones": bool(chat_profile.conversation_tones),
			"enable_chat": bool(chat_profile.enable_chat)
		}

		return profile

def create_chat_profile(user):

	chat_profile = frappe.get_doc({
		"doctype": "Chat Profile",
		"user": user
	}).insert(ignore_permissions=True)

	return profile

# @frappe.whitelist()
# def update(user, data):
# 	authenticate(user)

# 	data  = safe_json_loads(data)

# 	dprof = frappe.get_doc('Chat Profile', user)
# 	dprof.update(data)
# 	dprof.save(ignore_permissions = True)