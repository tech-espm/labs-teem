"use strict";

module.exports = {
	sep: "/",
	reg: /\\/g,
	importJs: false,

	cleanUp: function () {
		delete this["sep"];
		delete this["reg"];
		delete this["importJs"];
		delete this["cleanUp"];
		delete this["importFile"];
	},

	importFile: function (absolutePath) {
		const lcase = absolutePath.toLowerCase(),
			isJs = lcase.endsWith(".js");

		// https://v8.dev/features/dynamic-import
		// https://techsparx.com/nodejs/esnext/dynamic-import.html
		if ((isJs && !this.importJs) || lcase.endsWith(".cjs")) {
			try {
				return Promise.resolve(require(absolutePath));
			} catch (ex) {
				if (ex.code === "ERR_REQUIRE_ESM") {
					if (isJs)
						this.importJs = true;
				} else {
					return Promise.reject(ex);
				}
			}
		}

		let src = absolutePath;
		if (this.sep === "\\")
			src = "/" + src.replace(/\\/g, "/");
		src = encodeURI(src);

		return import("file://" + src);
	}
};
