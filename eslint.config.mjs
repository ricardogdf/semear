import path from "node:path";
import { fileURLToPath } from "node:url";

import { createMonorepoEslintConfig } from "@semear/config/eslint/next";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default createMonorepoEslintConfig(rootDirectory);
