console.log("Client is running!")

import { Application, Controller } from "https://cdn.jsdelivr.net/npm/stimulus@3.2.2/+esm"

class FormController extends Controller {
  static targets = ["input"]

  connect() {
    console.log("FormController connected!");
  }

  handleSubmit = (event) => {
    setTimeout(() => {
      this.inputTarget.value = "";
    })
  }
}


console.log(document.querySelector('form'));
const application = Application.start();
application.register("form", FormController);
