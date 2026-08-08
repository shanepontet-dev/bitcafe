// bit cafe admin: lets a file input accept a pasted image (Cmd/Ctrl+V)
// instead of always requiring "choose file" -- shared by
// admin-wall-buttons.js and admin-featured-sites.js, whose upload
// flows both just read input.files[0] at save time and don't
// otherwise care whether the file arrived by paste or by picking it
// from disk.
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
