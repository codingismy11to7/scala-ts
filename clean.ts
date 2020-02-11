// tslint:disable: no-var-requires
const rmrf = require("rimraf");

rmrf.sync("coverage");
rmrf.sync("dist");
rmrf.sync("docs");
rmrf.sync("staging");
