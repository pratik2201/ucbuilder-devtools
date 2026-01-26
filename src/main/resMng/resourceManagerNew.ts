export interface RuntimeResource {
  key: string;        // sharepnl:css:UUID
  type: string;       // css | image | data | html | text | raw
  content: string;
  source?: string;   // optional debug
}

export class ResourceManagerNew {

  private static map = new Map<string, RuntimeResource>();

  static register(res: RuntimeResource) {
    if (this.map.has(res.key)) {
      const i = this.map.get(res.key);
      console.log(`'${res.key}' is already registered for resource => source='${i.source}' and type='${i.type}' <=`);
      return;
    }
    this.map.set(res.key, res);
  }

  static bulkRegister(list: RuntimeResource[]) {
    for (const r of list) this.register(r);
  }

  static has(key: string) {
    return this.map.has(key);
  }

  static get(key: string) {
    return this.map.get(key) ?? null;
  }

  static getContent(key: string) {
    return this.map.get(key)?.content ?? null;
  }

  static keys() {
    return [...this.map.keys()];
  }

  static clear() {
    this.map.clear();
  }
}
