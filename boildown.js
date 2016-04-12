
var bd = (function() {
	'use strict';

	const BLOCKS    = [
		[ Meta,        /^% / ],
		[ Separator,   /^(?:(?:\s+[-+*]+){3,}|\s+[-+*]{4,})\s*((?:\[[^\]]+\])*)?$/ ],
		[ Edit,        /^\+{3}(?:\{([-\d]+)\})?/ ],
		[ Edit,        /^-{3}(?:\{([-\d]+)\})?/ ],
		[ Blockquote,  /^>{3,}(?:\{([ \w\.#]+)\})?/ ],
		[ Minipage,    /^(\*{3,})(?:\{(\w+)\})?/ ],
		[ Listing,     /^`{3,}\*?(?:\{(\w+(?: \w+)*)\})?/ ],
		[ Listing,     /^~{3,}\*?(?:\{(\w+(?: \w+)*)\})?/ ],
		[ Template,    /^={3,}(?:\{([- \w]+)\})?/ ],
		[ Blockquote2, /^> / ],
		[ Output,      /^! / ],
		[ Sample,      /^\? / ],
		[ List,        /^\* / ],
		[ List,        /^(#|[0-9]{1,2}|[a-zA-Z])\. / ],
		[ Note,        /^\s*\[(\w+)\](:)?(\*?)(?:\{([-\w.]+)\})?(.*?)((?:\[[^\]]+\])*)?$/ ],
		[ Table,       /^([:\|])[-:. ](.+?):?([:\|])(\*)?(?:\{(\d+).?(\d+)?\})?((?:\[[^\]]+\])*)?$/ ],
		[ Definition,  /^(:[^:]+:)\s*/ ],
		[ Figure,      /^(?:\( ((?:(?:https?:\/\/)?(?:[-\w]{0,15}[.\/#+?=&]?){1,20}))\s+([-+ ,.\w]+)? \)|\(\((.+?)\)\))((?:\[[^\]]+\])*)?$/ ],
		[ Heading,     /^([A-Z]\)?|(?:[\dIVX]+(?:\.\d+)*){1,6}|\s{5})\s\s*(.+?)\s*(?:(?:\{(\w+)\})?((?:\[[^\]]+\])*)?)?\s*$/ ],
		[ Heading,     /^(_+ )?([A-Z][\w]+)[\s_]*(?:(?:\{(\w+)\})?((?:\[[^\]]+\])*)?)?\s*$/ ],
		[ Paragraph,   /^(.|$)/ ]
	];

	const INLINE = [
		["&$1;",                 /&amp;(\w{2,16});/g ], // unescape HTML entities
		["<cite>$1</cite>",      /"(..*?)"/g ], // first! messes with attributes otherwise
		["<br class=\"newpage\"/>", / \\\\\*(?: |$)/g ],
		["<br/>",                / \\\\(?: |$)/g ],
		["$1<wbr>$2",            /(\w)\\-(\w)/g ],
		["$1&mdash;$2",          /(^| )-{3}($| )/g ],
		["$1&ndash;$2",          /(^| )--($| )/g ],
		["&hellip;",             /\.\.\./g ], 
		["<q>$2</q>$3",          /('{1,})(.*?[^'])\1($|[^'])/g, 5],
		["<sub>$2</sub>$3",      /(~{1,})(.*?[^~])\1($|[^~])/g, 5],
		["<sup>$2</sup>$3",      /(\^{1,})(.*?[^\^])\1($|[^\^])/g, 5 ],
		["<del>$1</del>",        /--(..*?)--/g ],
		["<ins>$1</ins>",        /\+\+(..*?)\+\+/g ],
		["<u class='label-$2'>$1</u>", /!(..*?)!\{(\d\d?)\}/g ],
		["<u class='$2'>$1</u>", /!(..*?)!\{([-a-z]+)\}/g ],
		["<tt>$1</tt>",          /``(..*?)``/g ],
		["<span style='font-variant:small-caps;'>$1</span>", /==(..*?)==/g ],
		["<span style='text-decoration: underline;'>$1</span>", /__(..*?)__/g ],
		["<kbd class='single'>$1</kbd>", /@(.)@/g ],
		["<kbd>$1</kbd>",        /@(..*?)@/g ],
		["<code>$1</code>",      /`(..*?)`/g ],
		["<strong>$1</strong>",  /\*(..*?)\*/g ],
		["<em>$1</em>",          /_(..*?)_/g ],
		[" <i>$1</i> ",          / \/([^\/ \t].*?[^\/ \t])\/ /g ],
		[" <s>$1</s> ",          / -([^- \t].*?[^- \t])- /g ],
		[" <def>$1</def> ",      / :([^: \t].*?[^: \t]): /g ],		
		["<span style='color: $2$3;'>$1</span>", /::([^:].*?)::\{(?:(\w{1,10})|(#[0-9A-Fa-f]{6}))\}/g ],
		["<a href=\"#sec-$1\" class='bd-sref'>$1</a>", /\^\[((?:\d+|[A-Z])(?:\.\d+)*)\]/g ],
		[substRef,               /\^\[# ?([-\w ]+)\]/g ], 
		["<a href='#$1' class='bd-nref'>$1</a>", /\^\[(\w+)\]/g ],
	];

	const URL = /^((?:https?:\/\/)?(?:[-\w]{0,15}[.\/#+?=&]?){1,20})$/;

	const LINKS = [ // inter document or external ones
		[ "bd-page", /^(\w){2,}$/ ],
		[ "bd-link", URL ],
	]

	const STYLES = [
		// dynamic values
		[ /^[\d\.]{1,4}%$/, "width"],
		[ /^[\d\.]{1,4}pt$/, "font-size"],
		[ /^[\d\.]{1,4}r?em$/, "font-size"],
		[ /^#\w{6}$/, "background-color"],
		[ /^[- \w]+$/ ], // length 1 => classes, else => style
		// fixed values
		[ /^\*$/, "font-weight", "bold"],
		[ /^_$/,  "font-style", "italic"],
		[ /^<<>>$/, "text-align", "justified"],
		[ /^<>$/, "text-align", "center"],
		[ /^<$/,  "text-align", "left"],
		[ /^>$/,  "text-align", "right"],
		[ /^<=$/, "float", "left"],
		[ /^=>$/, "float", "right"],
		[ /^<~>$/, "margin", "0 auto"],
		[ /^~>$/, "margin", "0 0 0 auto"],
		[ /^<~$/, "margin", "0 auto 0 0"],
		[ /^<<>>/, "clear", "both"],
		[ /^\\\\$/, "white-space", "pre-wrap"],
	];

	const TAGS = ["address", "article", "aside", "details", "figcaption", 
		"figure", "footer", "header", "menu", "nav", "section"];

	function Doc(markup) {
		this.markup = markup;
		this.lines  = markup.split(/\r?\n/g);
		this.html   = "";
		this.meta   = [];
		this.collections = {};
		// fx rendering
		this.doBlock   = doBlock;
		this.doInline  = doInline;
		this.doStyles  = doStyles;
		this.add       = function (html) { this.html+=html; }
		// fx helpers
		this.collection= collection;
		this.scan      = scan;
		this.unindent  = unindent;
		this.minIndent = minIndent;
		this.line      = function (n) { return this.lines[n]; }
	}

	return {
		init: function (markup) { return new Doc(markup); },
		toHTML: toHTML,
		escapeHTML: escapeHTML,
		decodeParam: decodeParam,
		text2id: text2id
	};

	/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ bd-functions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

	function toHTML(markup, start, end) {
		var doc = new Doc(markup);
		start = start || 0;
		end = end || doc.lines.length;
		doc.doBlock(start, end);
		for (var c in doc.collections) {
			if (doc.collections.hasOwnProperty(c)) {
				var col = doc.collections[c];
				if (col.id) {
					rollTemplate(doc, col.start, col.end, col.entries);
				}
			}
		}
		return doc.html;
	}

	function escapeHTML(html) {
		var div = document.createElement('div');
		div.appendChild(document.createTextNode(html));
		return div.innerHTML;
	}

	function decodeParam(name) {
		var url = new RegExp("[&?]"+name+"=([^&]+)").exec(window.location.search);
		return url && url[1] ? decodeURIComponent(url[1]) : "";
	}

	function text2id(text) {
		return text.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase();
	}

	/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Doc-functions ~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	function unindent(width, start, end, pattern) {
		var i = start;
		while (i < end && pattern.test(this.lines[i])) {
			this.lines[i] = this.lines[i].substring(Math.min(this.lines[i].length, width));
			i++;
		} 
		return i;
	}

	function scan(start, end, pattern) {
		var i = start;
		while (i < end && !pattern.test(this.lines[i])) { i++; }
		return i;
	}

	function minIndent(start, end, offset) {
		var res = 16;
		for (var i = start; i < end; i++) {
			res=Math.min(res, this.lines[i].substring(offset).search(/[^ \t]/)+offset); 
		}
		return res;
	}

	function collection(name) {
		name = name || 'undefined';
		name = bd.text2id(name).replace("-", "_");
		if (!this.collections[name]) {
			this.collections[name] = { entries: [] };
		}
		return this.collections[name];
	}

	function doBlock(start, end) {
		var i = start;
		while (i < end) {
			var before = i;
			var block = first(BLOCKS, this.lines[i], 1);
			i = block[0](this, i, end, block[1]);
			if (i === before) { 
				if (console && console.log) { console.log("endless loop at line "+i+": "+this.lines[i]); }
				i++; // error recovery: continue on next line
			}
		}
	}

	function doStyles(line, classes) {
		classes = classes ? classes : "";
		line = line ? line.replace(/\$(\w+)\$/, substParam) : "";
		var styles = "";
		var start = line.indexOf('[');
		while (start >= 0) {
			var end = line.indexOf(']', start);
			var val = line.substring(start+1, end);
			var style = first(STYLES, val, 0);
			if (style) {
				switch (style.length) {
					case 1:	classes+=" "+val; break;
					case 4: classes+=" "+style[3]; /* intentianal fall-through */
					case 3: val = style[2]; /* intentianal fall-through */
					case 2: styles+=" "+style[1]+":"+val+";";
				}
			}
			start = line.indexOf('[', end);
		}
		return (classes ? "\n\tclass='"+classes+"'" : "") + (styles ? "\n\tstyle='"+styles+"'" : "");
	}

	function doInline(line) {
		return substMarkup(bd.escapeHTML(line.replace(/\$(\w+)\$/, substParam)));
	}

	/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Inline ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

	function substMarkup(line) {
		line = line.replace(/\[\[([^ ]+)( [^\]]+)?\]\](\*)?/g, substLink);		
		var plains = [];		
		var stripped = "";
		var start = 0;
		var end = line.indexOf("{{", start);
		while (end >= 0)
		{
			if (end > start) { // add text up till literal section
				stripped+=line.substring(start, end);
			}
			start=end+2;
			end=line.indexOf("}}", start);
			stripped+="!!"+plains.length+"!!";			
			plains.push(line.substring(start, end));
			start=end+2;
			end=line.indexOf("{{", start);
		}
		stripped+=line.substring(start, line.length);
		var html = substInline(stripped);
		for (var i = 0; i < plains.length; i++) {
			html=html.replace("!!"+i+"!!", plains[i]);
		}
		return html;
	}

	function substLink(link, url, text, alt) {
		for (var i = 0; i < LINKS.length; i++) {
			if (LINKS[i][1].test(url)) {
				var cls = LINKS[i][0]+(alt ? " bd-part" : "")
				text = text ? "}}"+text.trim()+"{{" : /(?:^|\/)\w+$/.test(url) ? url.substring(url.lastIndexOf('/')+1).replace(/_/g, " ") : url;
				return "{{<a href=\""+url+"\" class=\""+cls+"\">"+text+"</a>}}";
			}
		}
		return link;
	}

	function substRef(ref, text) {
		return "<a href=\"#"+bd.text2id(text)+"\" class='ref'>"+text+"</a>";
	}

	function substParam(markup, name) {
		return doInline(decodeParam(name));
	}

	function substInline(line) {
		for (var i = 0; i < INLINE.length; i++) {
			var lmax = INLINE[i].length > 2 ? INLINE[i][2] : 1;			
			do {			
				var before = line.length;
				line = line.replace(INLINE[i][1], INLINE[i][0]);
			} while (--lmax > 0 && before !== line.length);
		}
		return line;
	}

	function first(arr, val, idx) {
		for (var i = 0; i < arr.length; i++) {
			if (arr[i][idx].test(val))
				return arr[i]; 			
		}
	}

	/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Blocks ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
	
	function Template(doc, start, end, pattern) {
		var name = pattern.exec(doc.line(start))[1];
		var i = doc.scan(start+1, end, pattern);
		if (name) {
			var col = doc.collection(name);
			col.id='lazy-'+start;
			col.start=start+1;
			col.end=i;
			doc.add("<div id='"+col.id+"'></div>");
			return i+1;
		}
		var j = doc.scan(i+1, end, pattern);
		var data = [];		
		for (var r = i+1; r < j; r++) {
			data.push(doc.line(r).split(';'));
		}
		rollTemplate(doc, start+1, i, data);
		return j+1;
	}

	function rollTemplate(doc, start, end, data) {
		var lines = [];
		var b = start;
		while (b < end && /^= /.test(doc.line(b))) {
			lines.push(doc.line(b++).substring(2));
		}
		var a = end-1;
		while (a > b && /^= /.test(doc.line(a))) { a--; }
		var template = doc.lines.slice(b, a+1);
		for (var r = 0; r < data.length; r++) {
			var row = data[r];
			for (var l = 0; l < template.length; l++) {
				var line = template[l];
				for (var v = 0; v < row.length; v++) {
					line = line.replace("$"+(v+1), row[v]);
				}
				lines.push(line);
			}
		}
		for (var k = a + 1; k < end; k++) {
			lines.push(doc.line(k).substring(2));
		}
		var olines = doc.lines;
		doc.lines = lines;
		doc.doBlock(0, lines.length);
		doc.lines = olines;
	}

	function Meta(doc, start, end) {
		var line = doc.line(start);
		var i = line.indexOf(':');
		if (i > 0) {		
			doc.meta.push([ line.substring(2, i), line.substring(i+1)]);
		}
		return start+1;
	}

	function Separator(doc, start, end) {
		doc.add("<hr "+doc.doStyles(doc.line(start))+" />\n");
		return start+1;
	}

	function Paragraph(doc, start, end) {
		var line = doc.line(start);
		if (/^\s*$/.test(line)) {
			doc.add("\n");
		} else {
			if (doc.html.endsWith("</p>")) {
				doc.html = doc.html.substring(0, doc.html.length-4)+"\n";
			} else {
				doc.add("<p>");
			}
			doc.add(doc.doInline(line));
			doc.add("</p>");
		}
		return start+1;
	}

	function Heading(doc, start, end, pattern) {
		var noTextIdStyle = pattern.exec(doc.line(start));
		var no = noTextIdStyle[1];
		var text = noTextIdStyle[2];
		var id = noTextIdStyle[3] ? noTextIdStyle[3] : bd.text2id(text);
		var title = /^\s{5}$/.test(no);
		var noa = /[A-Z0-9]/.test(no) ? "<a id=\"sec-"+no.replace(")", "").trim()+"\"></a> ": "";
		var n = title ? 1 : no ? no.split(/\./).length+1 : 2;
		doc.collection('heading').entries.push([id, n, no, text]);		
		doc.add("\n<h"+n+" id=\""+id+"\" "+doc.doStyles(noTextIdStyle[4])+">"+noa+doc.doInline(text)+"</h"+n+">\t");
		return start+1;
	}

	function prefixedBlock(doc, start, end, pattern, tag, attr) {
		var i = doc.unindent(2, start, end, pattern);
		doc.add("\n<"+tag+" "+attr+">"); 
		doc.doBlock(start, i);
		doc.add("</"+tag+">\n");
		return i;
	}

	function fencedBlock(doc, start, end, pattern, tag, attr) {
		var i = doc.scan(start+1, end, pattern);
		doc.add("\n<"+tag+" "+attr+" "+doc.doStyles(doc.line(start), "block")+">"); 
		doc.doBlock(start+1, i);
		doc.add("</"+tag+">\n");
		return i+1;
	}

	function Blockquote(doc, start, end, pattern) {
		var attr = pattern.exec(doc.line(start))[1];
		if (attr) { attr = "cite='"+attr+"'"; };
		return fencedBlock(doc, start, end, pattern, "blockquote", attr);
	}

	function Blockquote2(doc, start, end, pattern) {
		return prefixedBlock(doc, start, end, pattern, "blockquote", "");
	}

	function Edit(doc, start, end, pattern) {
		var line = doc.line(start);
		var tag = line.startsWith("---") ? "del" : "ins";
		var attr = pattern.exec(line)[1];
		if (attr) { attr = "datetime='"+attr+"'"; }
		return fencedBlock(doc, start, end, pattern, tag, attr);
	}

	function Output(doc, start, end, pattern) {
		var i = doc.unindent(2, start, end, pattern);
		doc.add("<table class='describe'><tr><td><pre class='source'><code>");
		var l0 = doc.html.length;
		// following line must be done before processing the lines!
		var example = bd.escapeHTML(doc.lines.slice(start, i).join("\n"));
		example = example.replace(/ /g, "<span> </span>");
		doc.doBlock(start, i);
		var content = bd.escapeHTML(doc.html.substring(l0).trim());
		doc.html=doc.html.substring(0, l0);
		doc.add(example);
		doc.add("</code></pre></td>\n<td><pre class='output'><samp>"); 
		doc.add(content);
		doc.add("</samp></pre>\n</td></tr></table>");
		return i;
	}

	function Sample(doc, start, end, pattern) {
		var i = doc.unindent(2, start, end, pattern);
		doc.add("<table class='example'><tr><td><pre class='source'><code>");
		var l0 = doc.html.length;
		// following line must be done before processing the lines!
		var example = bd.escapeHTML(doc.lines.slice(start, i).join("\n"));
		example = example.replace(/ /g, "<span> </span>");
		doc.doBlock(start, i);
		var content = doc.html.substring(l0);
		doc.html=doc.html.substring(0, l0);
		doc.add(example);
		doc.add("</code></pre></td>\n<td class='output'>"); 
		doc.add(content);
		doc.add("</td></tr></table>");
		return i;
	}

	function Listing(doc, start, end, pattern) {
		var mark = doc.line(start);
		var keywords = pattern.exec(mark)[1]
		if (keywords) { keywords = keywords.split(" "); }
		var highlight=mark.indexOf('*') == 3;
		var tag = mark.indexOf('`') === 0 ? "code" : "samp"; 
		doc.add("<pre"+doc.doStyles(mark, tag)+"><"+tag+">");
		var i = doc.scan(start+1, end, pattern);
		var minIndent = doc.minIndent(start, end, highlight ? 1 : 0);	
		for (var j = start+1; j < i; j++) {
			var line = doc.line(j);
			var dline = bd.escapeHTML(line.substring(minIndent));
			if (highlight) {
				if (" \t!".indexOf(line.charAt(0)) < 0) {
					var p = line.charAt(0)+"(..*?)"+line.charAt(0);
					dline = dline.replace(new RegExp(p, "g"), "<mark>$1</mark>");
				} else if (line.startsWith("!")) {
					dline = "<mark>"+dline+"</mark>";
				}
			}
			if (keywords) {
				for (var k = 0; k < keywords.length; k++) {
					dline = dline.replace(new RegExp("\\b("+keywords[k]+")\\b", "g"), "<b>$1</b>");
				}
			}
			doc.add("<span>"+dline+"\n</span>");
		}
		doc.add("</"+tag+"></pre>\n");
		return i+1;
	}

	function Figure(doc, start, end, pattern) {
		var i = start;
		var images = [];
		var caption = "";
		var style = "";
		var first = false;
		while (i < end && pattern.test(doc.line(i))) {
			var line = doc.line(i);
			var image = pattern.exec(line);
			if (line.startsWith("( ")) {
				images.push(image);
			} else {
				first = i === start;
				caption = "<figcaption>"+doc.doInline(image[3])+"</figcaption>";
				style = doc.doStyles(image[4]);
			}
			i++;
		}
		if (images.length > 1 || caption) {
			doc.add("<figure "+style+">");
		}
		if (caption && first) { doc.add(caption); }
		for (var j = 0; j < images.length; j++) {
			var title = images[j][2];
			title = title ? "title='"+title+"' alt='"+title+"'" : "";
			doc.add("<img src=\""+images[j][1]+"\" "+doc.doStyles(images[j][4])+" "+title+" />");
		}
		if (caption && !first) { doc.add(caption); }
		if (images.length > 1 || caption) {
			doc.add("</figure>");			
		}
		return i;
	}

	function Table(doc, start, end, pattern) {
		var i = start;
		var firstRow = true;
		var maxColumns = 0;
		var columns = 0;
		while (i < end && pattern.test(doc.line(i))) {
			var line = doc.line(i);
			var row = pattern.exec(line);
			var isCaption = line.startsWith("::");
			if (i == start) { doc.add("<table "+doc.doStyles(isCaption ? row[7] : "", "user")+">"); }
			if (isCaption) {
				var side = i === start ? "top" : "bottom";
				var caption = row[2];
				if (! /^\s*$/.test(caption)) {
					doc.add("<caption class='"+side+"'>"+doc.doInline(caption)+"</caption>");
				}
			} else if (/^[-\.]+$/.test(row[2])) {
				if (!firstRow) { doc.add("</tr>"); }
				firstRow = false;
				var classes = row[2].charAt(0) === '-' ? "bts-solid" : "";
				doc.add("<tr "+doc.doStyles(row[7], classes)+">");
				maxColumns = Math.max(columns, maxColumns);
				columns = 0;
				if (!pattern.test(doc.line(i+1))) {
					doc.add("<td colspan='"+maxColumns+"'></td>");
				}
			} else {
				if (firstRow) { doc.add("<tr>"); }
				firstRow = false;
				var tag = row[4] ? "th" : "td";
				var classes = (row[1] === '|' ? " bls-solid" : "")+(row[3] === '|' ? " brs-solid" : "");
				var span = (row[5] ? "colspan='"+row[5]+"'" : "")+(row[6] ? "rowspan='"+row[6]+"'" : "");
				doc.add("<"+tag+" "+span+" "+doc.doStyles(row[7], classes)+">");
				doc.add(doc.doInline(row[2]));
				doc.add("</"+tag+">");
				columns++;
			}
			i++;
		}
		doc.add("</tr></table>");
		return i;
	}

	function Note(doc, start, end, pattern) {
		var note = pattern.exec(doc.line(start));
		var aside = note[3] || note[4];
		var caption = note[1] + (note[2] ? note[2] : "");
		var id = 'note-'+start;
		if (aside) {
			var entry = [id, note[1], note[5]];
			doc.collection(note[1]).entries.push(entry);
			doc.collection(note[3]).entries.push(entry);
			doc.add("<aside "+doc.doStyles(note[6], id+' note '+note[1].toLowerCase())+">");
			doc.lines[start] = " *"+caption+"*"+note[5];
		} else {
			doc.add("<small id=\""+note[1]+"\" "+doc.doStyles(note[6], 'note')+"><dl><dt><def>"+caption+"</def></dt><dd>");
			doc.lines[start] = note[5];
		}
		var i = doc.unindent(2, start+1, end, /^\s{2}|^\s?$/);
		doc.doBlock(start, i);
		if (aside) {
			doc.add("</aside>");
		} else {
			doc.add("</dd></small>");
		}
		return i;
	}

	function Definition(doc, start, end, pattern) {
		var i = start;
		doc.add("<dl>");
		while (i < end && pattern.test(doc.line(i))) {
			doc.add("<dt>"+doc.doInline(" "+pattern.exec(doc.line(i))[1]+" ")+"</dt>\n<dd>");
			var i0 = i+1;
			i = doc.unindent(2, i0, end, /^\s{2}|^\s?$/);
			doc.doBlock(i0, i);
			doc.add("</dd>");
		}
		doc.add("</dl>");
	}

	function List(doc, start, end, pattern) {
		var i = start;		
		var bullet = pattern.test("* ");
		var no = pattern.exec(doc.line(i))[1];
		doc.add( bullet ? "<ul>\n" : "<ol type='"+listType(no)+"' start='"+listStart(no)+"'>\n");
		while (i < end && pattern.test(doc.line(i))) {
			var i0 = i;
			doc.lines[i] = doc.lines[i].substring(doc.lines[i].indexOf(' '));
			i = doc.unindent(2, i+1, end, /^(?:(?:[ \t]{2})|\s*$)/);
			doc.add("<li>\n\t");
			doc.doBlock(i0, i);
			doc.add("</li>\n");
		}
		doc.add( bullet ? "</ul>\n" : "</ol>\n");
		return i;
	}

	function listStart (item) { return item === '#' ? 1 : parseInt(item) ? parseInt(item) : item.charCodeAt() - listType(item).charCodeAt() + 1; } 
	function listType  (item) { var c = item.charAt(0); return /\d|#/.test(c) ? '1' : /i/i.test(c) ? c : /[A-Z]/.test(c) ? 'A' : 'a'; }

	function Minipage(doc, start, end, pattern) {
		var line = doc.line(start);
		var page = pattern.exec(line);
		var i = doc.scan(start+1, end, new RegExp("^"+page[1].replace(/\*/g, "\\*")+"($|[^\*])"));
		var tagged = page.length > 2 && page[2];
		var retag = tagged && TAGS.indexOf(page[2]) >= 0;
		var tag = retag? page[2] : "div";
		var classes = "minipage "+(tagged && !retag ? page[2] : "");
		doc.add("<"+tag+" "+doc.doStyles(line, classes)+"><div>\n");
		doc.doBlock(start+1, i); 
		doc.add("</div></"+tag+">\n");
		return i+1;
	}

})();
