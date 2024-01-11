import test from "ava";
import { writeToJson } from "../index.js";

test("should write successfully", (t) => {
  t.is(
    writeToJson("test.json", false, '{ "message": "hello world" }'),
    "test.json",
  );
});
