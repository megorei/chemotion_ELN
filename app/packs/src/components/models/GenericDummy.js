export default class GenericDummy {
  constructor() {
    this.type = 'dummy';
    this.field = uuid.v1();
    this.position = 100;
    this.label = '';
    this.default = '';
    this.required = false;
  }
}
