#![deny(clippy::all)]

use std::fs;

use napi::{Env, Error, JsBoolean, JsUnknown};
use serde_json::Value;

#[macro_use]
extern crate napi_derive;

#[napi]
pub fn write_to_json(env: Env, p: String, docker: Option<JsBoolean>, data: JsUnknown) -> String {
  let path = if let Some(value) = docker {
    if value.get_value().unwrap() {
      format!("/usr/local/apps/n-word-monitor/{}", p)
    } else {
      p
    }
  } else {
    p
  };

  let de_serialized: serde_json::Value = env.from_js_value(data).unwrap();

  let data = serde_json::to_string(&de_serialized).unwrap();

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

#[napi]
pub fn read_json(env: Env, p: String, docker: Option<JsBoolean>) -> Result<JsUnknown, Error> {
  let path = if let Some(value) = docker {
    if value.get_value().unwrap() {
      format!("/usr/local/apps/n-word-monitor/{}", p)
    } else {
      p
    }
  } else {
    p
  };

  let exists = fs::metadata(&path).is_ok();

  if !exists {
    println!("{} does not exist", &path);
    return env.to_js_value(&Value::Null);
  }

  let result = fs::read_to_string(&path);

  let result = match result {
    Ok(r) => r,
    Err(_) => {
      println!("Caught an error while reading at path: {}", &path);
      return env.to_js_value(&Value::Null);
    }
  };

  let json: Result<serde_json::Value, serde_json::Error> = serde_json::from_str(&result);

  let json = match json {
    Ok(j) => j,
    Err(_) => {
      println!("Caught an error while parsing json at path: {}", &path);
      return env.to_js_value(&Value::Null);
    }
  };

  env.to_js_value(&json)
}
