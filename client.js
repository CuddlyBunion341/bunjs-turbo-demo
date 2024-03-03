console.log("Client is running!")

import { Application, Controller } from "https://cdn.jsdelivr.net/npm/stimulus@3.2.2/+esm"

class FormController extends Controller {
  clear() {
    this.element.reset()
  }
}

const application = Application.start();
application.register("form", FormController);
