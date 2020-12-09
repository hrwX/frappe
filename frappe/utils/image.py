# Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals, print_function
from frappe.utils import cint
from PIL import Image

import traceback
import frappe
import io
import os
import re
import base64

IMAGE_CACHE_EXPIRES = 900

RESAMPLING = {
	"Nearest": Image.NEAREST,
	"Box": Image.BOX,
	"Bilinear": Image.BILINEAR,
	"Hamming": Image.HAMMING,
	"Bicubic": Image.BICUBIC,
	"Lanczos": Image.LANCZOS
}

IMAGE_FORMAT_MAP = {
	"JPEG": "JPEG",
	"JPG": "JPEG",
	"PNG": "PNG",
	"BMP": "BMP",
	"GIF": "GIF"
}

def resize_images(path, maxdim=700):
	import Image
	size = (maxdim, maxdim)
	for basepath, folders, files in os.walk(path):
		for fname in files:
			extn = fname.rsplit(".", 1)[1]
			if extn in ("jpg", "jpeg", "png", "gif"):
				im = Image.open(os.path.join(basepath, fname))
				if im.size[0] > size[0] or im.size[1] > size[1]:
					im.thumbnail(size, Image.ANTIALIAS)
					im.save(os.path.join(basepath, fname))

					print("resized {0}".format(os.path.join(basepath, fname)))

def image_resize_url(path, size):
	return "/resize/{}?size={}".format(path.lstrip('/'), size)

def sanitize_image_path(path):

	if ('.' not in path):
		return False

	filename, extn = os.path.splitext(path)
	extn = extn.replace(".", "")

	if extn not in ('jpg', 'jpeg', 'png', 'gif', 'bmp'):
		return False

	if re.match(r"^\/?files\/", path):
		filepath = frappe.utils.get_site_path(*("public/{}".format(path.lstrip('/')).split('/')))
	elif path.startswith("/assets/"):
		filepath = path
	else:
		return False

	return (filepath, filename, extn)

def get_image_resize_preset(name):
	resize_fields = ["width", "height", "resample", "quality"]

	if frappe.db.exists("Image Resize Preset", name):
		preset = frappe.get_all("Image Resize Preset", filters={"name": name}, fields=resize_fields)
	else:
		preset = frappe.get_all("Image Resize Preset", filters={"name": "small"}, fields=resize_fields)

	return preset[0]

@frappe.whitelist()
def image_to_base64(path, resize_preset_name=None, cache=False):
	path_info = sanitize_image_path(path)
	if not path_info:
		return False

	filepath, extn = (path_info[0], path_info[2])

	cache_key = "base64_image_cache|{}|{}".format(resize_preset_name or "_", filepath)
	cache_timeout = 900

	if cache:
		# Build cache path for this image and retrieve data
		data = frappe.cache().get_value(cache_key, None, None, True)
		if data:
			return data

	try:
		img = Image.open(filepath)
	except IOError:
		traceback.print_exc()
		return path

	# Enforce image format
	image_format = IMAGE_FORMAT_MAP.get(extn.upper(), "JPEG")
	buffer = io.BytesIO()

	if resize_preset_name:
		preset = get_image_resize_preset(resize_preset_name)
		cache_timeout = preset.get("cache_timeout", IMAGE_CACHE_EXPIRES)
		# Enforce image format
		image_format = IMAGE_FORMAT_MAP.get(extn.upper(), "JPEG")
		buffer = resize_image(img, preset, image_format)

		if not buffer:
			return False
	else:
		try:
			img.save(buffer, format=image_format)
		except Exception:
			traceback.print_exc()

			return False

	data = "data:image/{};base64,{}".format(image_format.lower(), buffer_to_base64(buffer))

	if cache:
		# Build cache path for this image and retrieve data
		frappe.cache().set_value(cache_key, data, None, cache_timeout)

	return data

def buffer_to_base64(buffer):
	"""Converts a buffer to a base64 string representation.

	Useful to convert images to base64 strings."""

	return base64.b64encode(buffer.getvalue()).decode()

def process_thumbnail(path, options):

	path_info = sanitize_image_path(path)
	if not path_info:
		return False

	filepath, extn = (path_info[0], path_info[2])
	buffer = io.BytesIO()

	try:
		img = Image.open(filepath)
	except IOError:
		raise NotFound

	# Enforce image format
	image_format = IMAGE_FORMAT_MAP.get(extn.upper(), "JPEG")

	buffer = resize_image(img, options, image_format)

	if not buffer:
		return False

	return buffer.getvalue()

def resize_image(img, options, image_format):
	buffer = io.BytesIO()

	# capture desired image width and height
	width = cint(options.width or 0) or cint(options.size or 0)
	height = cint(options.height or 0) or cint(options.size or 0)

	# default setting width to height and viceversa when either one is missing
	# also defaults to 300x300 pixels max size when size information is missing
	width = width or height or 300
	height = height or width or 300
	size = (width, height)

	# Defaults sampling to antialiasing
	resample = RESAMPLING.get(options.resample, "Bilinear")

	# Defaults quality for JPG only
	quality = cint(options.quality or 75)

	# Actual image resize
	img.thumbnail(size, resample)

	# default image options for PIL processing
	image_options = dict(
		optimize=True, 
		progressive=True, 
		quality=quality
	)

	if image_format == "GIF":
		# For GIF Animations only so we keep all frames
		image_options["save_all"] = True
	
	try:
		img.save(buffer, 
			format=image_format,
			**image_options
		)
	except Exception:
		traceback.print_exc()

		return False


	# Return image bytes
	return buffer

