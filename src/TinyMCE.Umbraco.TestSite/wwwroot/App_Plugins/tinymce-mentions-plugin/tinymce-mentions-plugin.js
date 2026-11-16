import { UmbTinyMcePluginBase as i } from "@tiny-mce-umbraco/backoffice/core";
function r() {
  return (n, e) => {
    const t = [
      { id: "1", name: "John Smith" },
      { id: "2", name: "Joe Cool" },
      { id: "3", name: "Zander Geulph" }
    ], o = n.term.toLowerCase();
    e(t.filter((s) => s.name.toLowerCase().includes(o)).slice(0, 10));
  };
}
class c extends i {
  constructor(e) {
    super(e);
  }
  // Runs before each editor initialises: hands TinyMCE's premium `mentions` plugin its fetch handler.
  static async extendEditorConfig(e) {
    e.mentions_fetch = r();
  }
}
export {
  c as default
};
//# sourceMappingURL=tinymce-mentions-plugin.js.map
