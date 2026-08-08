// bit cafe admin: lets a file input accept a pasted image (Cmd/Ctrl+V)
// or a dropped one (wireImageDrop, below) instead of always requiring
// "choose file" -- shared by admin-wall-buttons.js and
// admin-featured-sites.js, whose upload flows both just read
// input.files[0] at save time and don't otherwise care whether the
// file arrived by paste, drop, or picking it from disk.
//
// best effort, and clear about its limits: raw image bytes never
// carry a link or a name -- there's no metadata to read either out of
// a bitmap. but when the clipboard *also* carries a URL alongside the
// image (common when copying an image straight off a webpage, since
// browsers often tuck the source page's link into text/uri-list or
// text/plain next to the image bytes), this fills the url field with
// it and takes a rough guess at a site name from its hostname. a
// clipboard that's only image bytes -- e.g. a screenshot, or an image
// copied out of a design tool -- just fills the file and leaves url/
// name alone, exactly like choosing a file from disk always has.
export function wireImagePaste(form, input, opts) {
  opts = opts || {};

  form.addEventListener("paste", function (evt) {
    var items = (evt.clipboardData && evt.clipboardData.items) || [];
    var imageFile = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind === "file" && items[i].type.indexOf("image/") === 0) {
        imageFile = items[i].getAsFile();
        break;
      }
    }
    if (!imageFile) return; // nothing image-shaped on the clipboard -- let the paste behave normally

    // clipboard image Blobs often arrive with no filename at all --
    // give it one so the upload endpoint (which reads a filename to
    // pick a file extension) gets something sane instead of "".
    var ext = (imageFile.type.split("/")[1] || "png").split("+")[0];
    var named = new File([imageFile], imageFile.name || ("pasted-image." + ext), { type: imageFile.type });

    var dt = new DataTransfer();
    dt.items.add(named);
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    evt.preventDefault();

    if (opts.urlInput && !opts.urlInput.value.trim()) {
      var text = evt.clipboardData.getData("text/uri-list") || evt.clipboardData.getData("text/plain");
      var url = (text || "").trim().split("\n")[0];
      if (/^https?:\/\//i.test(url)) {
        opts.urlInput.value = url;
        opts.urlInput.dispatchEvent(new Event("input", { bubbles: true }));
        if (opts.nameInput && !opts.nameInput.value.trim()) {
          var guess = guessSiteName(url);
          if (guess) {
            opts.nameInput.value = guess;
            opts.nameInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      }
    }
  });
}

// lets a drop zone (a plain container element, not the file input
// itself -- image-in-a-link markup swallows clicks/drops on the input
// otherwise) accept a dragged-in badge. two very different cases show
// up as a "drop" here:
//
//  - a real file, dragged from the OS/Finder or an app that hands
//    over actual bytes -- dataTransfer.files is populated, used
//    directly, no network round-trip needed.
//  - an <img> dragged out of a webpage (the common case: dragging a
//    badge straight off a webring page like links.html's own). browsers
//    only ever hand over that image's *own* URL here, never its
//    bytes -- so opts.fetchFromUrl(url) does the actual fetch, which
//    has to happen server-side (see uploads/badge-from-url.js) since
//    the browser's own fetch() would usually be blocked by the source
//    site's CORS policy.
//
// name/link autofill from a drop is best-effort and often incomplete:
// most browsers hand over only the image's own url on a plain image
// drag, never the destination link a wrapping <a> might have pointed
// at, so opts.urlInput frequently still needs a manual paste even
// when opts.nameInput fills in fine from the image's alt text.
export function wireImageDrop(dropzone, input, opts) {
  opts = opts || {};

  ["dragenter", "dragover"].forEach(function (type) {
    dropzone.addEventListener(type, function (evt) {
      evt.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });
  ["dragleave", "dragend", "drop"].forEach(function (type) {
    dropzone.addEventListener(type, function () {
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone.addEventListener("drop", function (evt) {
    evt.preventDefault();
    if (opts.onDrop) opts.onDrop();

    var parsed = parseDraggedHtml(evt.dataTransfer.getData("text/html"));
    var gotImage = false;

    if (evt.dataTransfer.files && evt.dataTransfer.files.length) {
      var dt = new DataTransfer();
      dt.items.add(evt.dataTransfer.files[0]);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      if (opts.onFile) opts.onFile(evt.dataTransfer.files[0]);
      gotImage = true;
    } else {
      // text/uri-list is checked first: it's specifically defined to
      // hold absolute URIs, where a parsed <img src> can turn out to
      // be relative (resolved against a page we have no base URL
      // for) or a lazy-loader's placeholder (a data: URI, or a src
      // that's not the real image at all until it scrolls into view)
      // -- either of which would otherwise silently win and produce
      // nothing fetchFromUrl can use.
      var uriList = evt.dataTransfer.getData("text/uri-list") || evt.dataTransfer.getData("text/plain");
      var srcUrl = firstAbsoluteUrl([uriList, parsed.src]);
      if (srcUrl && opts.fetchFromUrl) {
        opts.fetchFromUrl(srcUrl);
        gotImage = true;
      }
    }

    if (opts.nameInput && !opts.nameInput.value.trim() && parsed.alt) {
      opts.nameInput.value = parsed.alt;
      opts.nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (opts.urlInput && !opts.urlInput.value.trim() && parsed.href) {
      opts.urlInput.value = parsed.href;
      opts.urlInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // never fail silently -- if nothing image-shaped could be pulled
    // out of the drop at all, say so instead of just doing nothing.
    if (!gotImage && opts.onNoImage) opts.onNoImage();
  });
}

function firstAbsoluteUrl(candidates) {
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (c && /^https?:\/\//i.test(c.trim())) return c.trim().split("\n")[0];
  }
  return null;
}

// parses the text/html a drag carries (a serialized fragment of
// whatever was dragged) just enough to pull an image src/alt and a
// wrapping link's href back out. DOMParser here never inserts
// anything into the live page, so a hostile fragment can't run script
// or load anything -- it's just read as data.
//
// falls back through the usual lazy-loading attributes (data-src,
// data-original, srcset) after plain src, since a lot of sites with a
// long badge grid like a webring page leave src as a placeholder
// (often a data: URI, sometimes just empty) until the real image
// scrolls into view -- src alone would silently find nothing on
// those pages even though the image is right there on screen.
function parseDraggedHtml(html) {
  if (!html) return {};
  try {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var img = doc.querySelector("img");
    var a = doc.querySelector("a[href]");
    var srcsetFirst = img && img.getAttribute("srcset")
      ? img.getAttribute("srcset").split(",")[0].trim().split(/\s+/)[0]
      : null;
    return {
      src: img
        ? (img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original") || srcsetFirst)
        : null,
      alt: img ? (img.getAttribute("alt") || "").trim() : "",
      href: a ? a.getAttribute("href") : null,
    };
  } catch (err) {
    return {};
  }
}

function guessSiteName(url) {
  try {
    var host = new URL(url).hostname.replace(/^www\./, "");
    var labels = host.split(".");
    var stem = labels.length > 1 ? labels.slice(0, -1).join(".") : host;
    return stem.replace(/[-.]/g, " ").trim();
  } catch (err) {
    return "";
  }
}
