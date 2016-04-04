
var bdReader = (function() {

	return {
		load: load,
		open: open
	}

	function load(file, onSuccess, onError) {
		var request = new XMLHttpRequest();
		request.onreadystatechange = function() {
			if (request.readyState == 4) {
				if (request.status == 200) {
					onSuccess(request.responseText);
				} else if (onError) {
					onError(request.status);
				}
			}
		};
		request.open("GET", file, true);
		request.send();
	}

	// config {
	// url: String (of the file to open) 
	// docId: String (id of node to contain document)
	// markupId: String (id of node to contain the markup)
	// redirect: boolean (do redirect on error)
	// 
	// }
	function open(config) {
		var url = config.url;
		var loaded = [];
		loaded.push(url);
		load(url, function(markup) {
			if (config.markupId) {
				document.getElementById(config.markupId).innerHTML=markup;
			}
			if (config.docId) {
				var doc = document.getElementById(config.docId);
				doc.innerHTML=bd.toHTML(markup);
				if (config.includes) {
					includes(doc, loaded);
				}
			}
		}, function(status) {
			if (config.redirect && url !== "404.bd") {
				window.location="?url=404.bd&target="+encodeURIComponent(url);
			}
		});
	}

	function includes(e, loaded) {
		// FIXME 1 list per link (path downwards to avoid loops)
		// FIXME a map of already loaded files to their markup
		var links = e.getElementsByClassName('bd-include');
		if (!links) { return; }
		for (var i = 0; i < links.length; i++) {
			include(links[i], loaded);
		}
	}

	function include(a, loaded) {
		var url = a.href;
		var range = /#L(\d+)-L(\d+)/.exec(url);
		if (loaded.indexOf(url) < 0) {
			loaded.push(url);
			url = range ? url.substring(0, url.indexOf('#')) : url;
			load(url, function(markup) {
				var include = document.createElement("span");
				include.innerHTML = range 
					? bd.toHTML(markup, parseInt(range[1]), parseInt(range[2])) 
					: bd.toHTML(markup);
				a.parentNode.replaceChild(include, a);
				includes(include, loaded);
			});
		}
	}

})();
