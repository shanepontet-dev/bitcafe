// bit cafe admin: drag-to-reorder (mouse) + arrow-key (keyboard)
// behavior for admin lists backed by a sort_order column, factored out
// so admin-wall-buttons.js and admin-featured-sites.js don't each
// carry their own copy of what admin-movies.js originally wrote
// inline for movie night's reorderable list. that file is left as-is
// with its own copy rather than refactored onto this, to avoid
// touching a working feature it doesn't need changing.
//
// wireDragRow(li, handle, list, onReordered) makes one row's handle
// draggable within `list` and movable with ArrowUp/ArrowDown; call it
// once per rendered row. persistOrder(list, items, patch, onError)
// reads the DOM order back out afterward and PATCHes sort_order for
// whichever rows actually moved -- `items` is the array last rendered
// into `list` (matched to its children by data-id), `patch(id, index)`
// does the actual request and must resolve to a Response-like object
// with `.ok`.

let draggedLi = null;

export function wireDragRow(li, handle, list, onReordered) {
  li.draggable = false;
  handle.addEventListener("mousedown", function () { li.draggable = true; });
  handle.addEventListener("mouseup", function () { li.draggable = false; });

  li.addEventListener("dragstart", function (evt) {
    draggedLi = li;
    li.classList.add("is-dragging");
    evt.dataTransfer.effectAllowed = "move";
    evt.dataTransfer.setData("text/plain", li.dataset.id);
  });

  li.addEventListener("dragover", function (evt) {
    evt.preventDefault();
    if (!draggedLi || draggedLi === li) return;
    var rect = li.getBoundingClientRect();
    var before = (evt.clientY - rect.top) < rect.height / 2;
    list.insertBefore(draggedLi, before ? li : li.nextSibling);
  });

  li.addEventListener("drop", function (evt) { evt.preventDefault(); });

  li.addEventListener("dragend", function () {
    li.draggable = false;
    li.classList.remove("is-dragging");
    draggedLi = null;
    onReordered();
  });

  handle.addEventListener("keydown", function (evt) {
    if (evt.key !== "ArrowUp" && evt.key !== "ArrowDown") return;
    evt.preventDefault();
    if (evt.key === "ArrowUp") {
      var prev = li.previousElementSibling;
      if (!prev) return;
      list.insertBefore(li, prev);
    } else {
      var next = li.nextElementSibling;
      if (!next) return;
      list.insertBefore(next, li);
    }
    handle.focus();
    onReordered();
  });
}

export function persistOrder(list, items, patch, onError) {
  var ids = Array.from(list.children).map(function (li) { return li.dataset.id; });
  var updates = [];
  ids.forEach(function (id, index) {
    var item = items.find(function (m) { return String(m.id) === id; });
    if (!item || item.sort_order === index) return;
    item.sort_order = index;
    updates.push(patch(id, index));
  });
  if (!updates.length) return;
  Promise.all(updates).then(function (results) {
    if (results.some(function (res) { return !res.ok; })) throw new Error();
  }).catch(onError);
}
