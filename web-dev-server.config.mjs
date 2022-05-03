// eslint-disable-next-line node/no-unpublished-import
import { fromRollup } from '@web/dev-server-rollup';
// eslint-disable-next-line node/no-unpublished-import
import rollupCommonjs from '@rollup/plugin-commonjs';

const commonjs = fromRollup(rollupCommonjs);

export default {
  plugins: [
    commonjs({
      exclude: [ 'src', 'dist', 'instrumented' ]
    })
  ],
  http2: true,
  // sslKey: "C:/Users/versa/Documents/GitHub/key.pem",
  // sslCert: "C:/Users/versa/Documents/GitHub/cert.pem"
  sslKey: "C:/WINDOWS/system32/key.pem",
  sslCert: "C:/WINDOWS/system32/cert.pem"
};
