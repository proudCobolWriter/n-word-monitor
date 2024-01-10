#![deny(clippy::all)]

use std::fs;

use napi::JsBoolean;

#[macro_use]
extern crate napi_derive;

#[napi]
pub fn write_to_json(p: String, docker: JsBoolean, data: String) -> String {
  let path = if docker.get_value().unwrap() {
    format!("/usr/local/apps/n-word-monitor/{}", p)
  } else {
    p
  };

  let result = fs::write(&path, data);

  match result {
    Ok(_) => {
      println!("{} was successfully written", &path);
      path
    }
    Err(_) => {
      println!("Caught an error while writing at path: {}", &path);
      path
    }
  }
}
