/**
 * Script injected into a stored HTML page so readers can comment on its words.
 *
 * The page runs in a sandboxed iframe with no same-origin access, on purpose:
 * stored HTML is not trusted with the rest of the site. That means the parent
 * cannot reach into the document to place highlights, so the two talk over
 * postMessage instead — the page reports what was selected, and the parent
 * sends back the anchors to mark up.
 *
 * Anchors are the quoted words plus context either side rather than an offset,
 * so editing one part of a page doesn't move the comments on another.
 */
export const REVIEW_LAYER = String.raw`
<style>
  .__rv-mark { background: #fde68a; border-bottom: 1px solid #d97706; cursor: pointer; }
  .__rv-mark[data-resolved="1"] { background: #f1f5f9; border-bottom-color: #cbd5e1; }
  .__rv-num {
    display: inline-block; vertical-align: super; font: 600 10px/1 ui-sans-serif, system-ui, sans-serif;
    background: #1c1917; color: #fff; border-radius: 999px; padding: 2px 5px; margin-left: 2px;
    cursor: pointer; user-select: none;
  }
  #__rv-btn {
    position: absolute; z-index: 2147483647; transform: translate(-50%, -100%);
    background: #1c1917; color: #fff; border: 0; border-radius: 8px;
    padding: 5px 10px; font: 500 12px/1 ui-sans-serif, system-ui, sans-serif;
    cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.25);
  }
</style>
<script>
(function () {
  if (window.__rvLoaded) return;
  window.__rvLoaded = true;

  var CTX = 40; // characters of context kept either side of a quote

  function post(msg) { try { parent.postMessage(msg, "*"); } catch (e) {} }

  /** Text nodes in document order, skipping our own furniture. */
  function textNodes() {
    var out = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        while (p) {
          var t = p.tagName;
          if (t === "SCRIPT" || t === "STYLE" || p.id === "__rv-btn" ||
              (p.className && String(p.className).indexOf("__rv-num") >= 0)) {
            return NodeFilter.FILTER_REJECT;
          }
          p = p.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n; while ((n = walker.nextNode())) out.push(n);
    return out;
  }

  function flatten() {
    var nodes = textNodes(), text = "", map = [];
    for (var i = 0; i < nodes.length; i++) {
      map.push({ node: nodes[i], start: text.length });
      text += nodes[i].nodeValue;
    }
    return { text: text, map: map };
  }

  function locate(flat, offset) {
    for (var i = flat.map.length - 1; i >= 0; i--) {
      if (flat.map[i].start <= offset) {
        return { node: flat.map[i].node, offset: offset - flat.map[i].start };
      }
    }
    return null;
  }

  /**
   * Absolute offset of a range boundary within the flattened text.
   *
   * A boundary can sit on an element rather than a text node (selecting a whole
   * paragraph does this), so fall back to the nearest text node inside it.
   */
  function absOffset(flat, container, offset, isEnd) {
    if (container.nodeType === 3) {
      for (var i = 0; i < flat.map.length; i++) {
        if (flat.map[i].node === container) return flat.map[i].start + offset;
      }
      return null;
    }
    var kids = container.childNodes;
    var probe = isEnd ? kids[offset - 1] : kids[offset];
    if (!probe) probe = container;
    var inside = [];
    for (var j = 0; j < flat.map.length; j++) {
      if (probe.contains ? probe.contains(flat.map[j].node) : false) inside.push(flat.map[j]);
    }
    if (!inside.length) return null;
    return isEnd
      ? inside[inside.length - 1].start + inside[inside.length - 1].node.nodeValue.length
      : inside[0].start;
  }

  /** Nearest heading above a node — the "Section" column in the sheet. */
  function sectionFor(node) {
    var el = node.nodeType === 3 ? node.parentElement : node;
    while (el) {
      var prev = el.previousElementSibling;
      while (prev) {
        if (/^H[1-6]$/.test(prev.tagName)) return prev.textContent.trim().slice(0, 120);
        prev = prev.previousElementSibling;
      }
      el = el.parentElement;
    }
    var h = document.querySelector("h1,h2,h3");
    return h ? h.textContent.trim().slice(0, 120) : "";
  }

  // ---- selecting text -------------------------------------------------------
  var btn = null;
  function clearBtn() { if (btn) { btn.remove(); btn = null; } }

  document.addEventListener("mouseup", function () {
    setTimeout(function () {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { clearBtn(); return; }
      var range = sel.getRangeAt(0);

      // Take the offsets from the range rather than searching for the selected
      // string. selection.toString() gives rendered text with whitespace
      // collapsed, which will not be found in the raw node text we anchor
      // against, so any selection spanning a line break would be lost.
      var flat = flatten();
      var from = absOffset(flat, range.startContainer, range.startOffset, false);
      var to = absOffset(flat, range.endContainer, range.endOffset, true);
      if (from == null || to == null || to <= from) { clearBtn(); return; }

      var quoted = flat.text.slice(from, to);
      if (quoted.trim().length < 2 || quoted.length > 2000) { clearBtn(); return; }

      var payload = {
        __rv: "select",
        quoted: quoted,
        prefix: flat.text.slice(Math.max(0, from - CTX), from),
        suffix: flat.text.slice(to, to + CTX),
        section: sectionFor(range.startContainer)
      };

      var rect = sel.getRangeAt(0).getBoundingClientRect();
      clearBtn();
      btn = document.createElement("button");
      btn.id = "__rv-btn";
      btn.textContent = "Comment";
      btn.style.left = (rect.left + rect.width / 2 + window.scrollX) + "px";
      btn.style.top = (rect.top + window.scrollY - 6) + "px";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        post(payload);
        clearBtn();
        sel.removeAllRanges();
      });
      document.body.appendChild(btn);
    }, 0);
  });

  document.addEventListener("mousedown", function (e) {
    if (btn && e.target !== btn) clearBtn();
  });

  // ---- drawing existing anchors --------------------------------------------
  function clearMarks() {
    document.querySelectorAll(".__rv-num").forEach(function (n) { n.remove(); });
    document.querySelectorAll(".__rv-mark").forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
  }

  /**
   * Wrap every text node the span covers in its own <mark>.
   *
   * Range.surroundContents() would be shorter but throws the moment a
   * selection crosses an element boundary — which is most of them, since any
   * <strong> or <em> inside the quoted words is enough. Splitting each node and
   * wrapping the pieces works whatever the markup does.
   */
  function wrapSpan(flat, from, to, thread, resolved) {
    var pieces = [];
    for (var i = 0; i < flat.map.length; i++) {
      var entry = flat.map[i], len = entry.node.nodeValue.length;
      var localFrom = Math.max(0, from - entry.start);
      var localTo = Math.min(len, to - entry.start);
      if (localTo > localFrom) pieces.push({ node: entry.node, from: localFrom, to: localTo });
    }
    if (!pieces.length) return null;

    var marks = [];
    // Back to front: splitting a node invalidates offsets after it, not before.
    for (var j = pieces.length - 1; j >= 0; j--) {
      var piece = pieces[j], target = piece.node;
      try {
        if (piece.to < target.nodeValue.length) target.splitText(piece.to);
        if (piece.from > 0) target = target.splitText(piece.from);
        var mark = document.createElement("mark");
        mark.className = "__rv-mark";
        mark.setAttribute("data-thread", thread);
        if (resolved) mark.setAttribute("data-resolved", "1");
        target.parentNode.insertBefore(mark, target);
        mark.appendChild(target);
        marks.unshift(mark);
      } catch (err) { /* skip a node we can't split; the rest still mark up */ }
    }
    return marks.length ? marks : null;
  }

  function draw(anchors) {
    clearMarks();
    var missing = [];
    anchors.forEach(function (a) {
      if (!a.quoted) return;
      var flat = flatten();
      // Prefer the quote in its original context; fall back to the words alone.
      var needle = a.prefix + a.quoted + a.suffix;
      var at = flat.text.indexOf(needle);
      var start = at >= 0 ? at + a.prefix.length : flat.text.indexOf(a.quoted);
      if (start < 0) { missing.push(a.thread); return; }

      var marks = wrapSpan(flat, start, start + a.quoted.length, a.thread, a.status === "resolved");
      if (!marks) { missing.push(a.thread); return; }

      var num = document.createElement("span");
      num.className = "__rv-num";
      num.textContent = a.thread;
      var last = marks[marks.length - 1];
      last.parentNode.insertBefore(num, last.nextSibling);

      var jump = function () { post({ __rv: "open", thread: a.thread }); };
      num.addEventListener("click", jump);
      marks.forEach(function (m) { m.addEventListener("click", jump); });
    });
    post({ __rv: "drawn", missing: missing });
  }

  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.__rv !== "anchors" || !Array.isArray(d.anchors)) return;
    draw(d.anchors);
  });

  post({ __rv: "ready" });
})();
</script>
`;
