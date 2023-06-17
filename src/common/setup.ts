import * as fs from "fs-extra";
import * as path from "path";
import { EXTENSION_ROOT_DIR } from "./constants";

export interface IServerInfo {
  name: string;
  module: string;
}

export function loadServerDefaults(): IServerInfo {
  const packageJson = path.join(EXTENSION_ROOT_DIR, "package.json");
  const content = fs.readFileSync(packageJson).toString();
  const config = JSON.parse(content);
  return config.serverInfo as IServerInfo;
}
