
var bdReader = (function() {

	var opened = {};
	var inTransit = {};

	return {
		load: load,
		open: open
	}

	function load(file, onSuccess, onError) {
		if (!file.endsWith(".bd")) {
			file += ".bd";
		}
		var markup = opened[file];
		if (markup) {
			onSuccess(markup);
			return;
		}
		var transit = inTransit[file];
		if (transit) {
			transit.push({"onSuccess": onSuccess, "onError": onError});
			return;
		}
		transit = [];
		transit.push({"onSuccess": onSuccess, "onError": onError});
		inTransit[file] = transit;
		var request = new XMLHttpRequest();
		request.onreadystatechange = function() {
			if (request.readyState == 4) {
				if (request.status == 200) {
					for (var i = 0; i < transit.length; i++) {
						transit[i].onSuccess(request.responseText);
					}
				} else if (onError) {
					for (var i = 0; i < transit.length; i++) {
						transit[i].onError(request.status);
					}
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
		load(url, function(markup) {
			if (config.markupId) {
				document.getElementById(config.markupId).innerHTML=markup;
			}
			if (config.docId) {
				var doc = document.getElementById(config.docId);
				doc.innerHTML=bd.toHTML(markup);
				if (config.includes) {
					includes(doc, []);
				}
			}
			if (window.location.hash) {
				document.getElementById(window.location.hash.substring(1)).scrollIntoView();
			}
		}, function(status) {
			if (config.redirect && url !== "404.bd") {
				window.location="?url=404.bd&target="+encodeURIComponent(url);
			}
		});
	}

	function includes(e, loaded) {
		var links = e.getElementsByClassName('bd-part');
		if (!links) 
			return;
		for (var i = 0; i < links.length; i++) {
			include(links[i], loaded.slice(0));
		}
	}

	function include(a, loaded) {
		if (a.hostname !== window.location.hostname || loaded.indexOf(a.href) >= 0)
			return; // no cross domain includes
		var url = a.href;
		loaded.push(url);
		var file = url.lastIndexOf('#') < 0 ? url : url.substring(0, url.lastIndexOf('#'));
		load(file, function(markup) {
			var include = document.createElement("div");
			include.innerHTML = extract(url, markup); 
			a.parentNode.replaceChild(include, a);
			includes(include, loaded);
		});
	}
	
	function extract(url, markup) {
		var range = /#L(\d+)-L(\d+)/.exec(url);
		if (range) {
			return bd.toHTML(markup, parseInt(range[1]), parseInt(range[2]));
		}
		range = /#S([\w.]+)-S([\w.]+)/.exec(url);
		if (range) {
			var doc = bd.toDoc(markup);
			var s = doc.scan(0, doc.lines.length, new RegExp("^"+range[1].replace(".", "\\.")));
			var e = doc.scan(s+1, doc.lines.length, new RegExp("^"+range[2].replace(".", "\\.")));
			doc.process(s,e);			
			return doc.html;
		}
		return bd.toHTML(markup);
	}

})();
