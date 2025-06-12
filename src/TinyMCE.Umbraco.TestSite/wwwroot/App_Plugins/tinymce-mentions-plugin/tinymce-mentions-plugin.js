var l = (n) => {
  throw TypeError(n);
};
var d = (n, i, t) => i.has(n) || l("Cannot " + t);
var a = (n, i, t) => (d(n, i, "read from private field"), t ? t.call(n) : i.get(n)), r = (n, i, t) => i.has(n) ? l("Cannot add the same private member more than once") : i instanceof WeakSet ? i.add(n) : i.set(n, t), c = (n, i, t, e) => (d(n, i, "write to private field"), e ? e.call(n, t) : i.set(n, t), t);
import { UmbTinyMcePluginBase as u } from "@tiny-mce-umbraco/backoffice/core";
async function h() {
  return (n, i) => {
    var e = [
      {
        id: "1",
        name: "John Smith"
      },
      {
        id: "2",
        name: "Joe Cool"
      },
      {
        id: "3",
        name: "Zander Geulph"
      }
    ].filter(
      (m) => m.name.toLowerCase().includes(n.term.toLowerCase())
    );
    e = e.slice(0, 10), i(e);
  };
}
var s, o;
class x extends u {
  constructor(t) {
    super(t);
    r(this, s);
    r(this, o);
    console.log("mentions-assitant initialized"), c(this, s, t.editor), c(this, o, t.host.configuration), a(this, s) && console.log("mentions-assitant this.#editor", [a(this, s)]), a(this, o) && console.log("mentions-assitant this.#configuration", [a(this, o)]);
  }
  static async extendEditorConfig(t) {
    console.log("mentions-assitant extendEditorConfig 1", [t]), t.mentions_fetch = await h(), console.log("mentions-assitant extendEditorConfig 2", [t]);
  }
  async init() {
    console.log("mentions-assitant init 1");
  }
}
s = new WeakMap(), o = new WeakMap();
export {
  x as default
};
//# sourceMappingURL=tinymce-mentions-plugin.js.map
