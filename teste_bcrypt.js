const bcrypt = require('bcrypt');

(async () => {
  const senhaDigitada = '1234';
  const hashBanco = '$2b$10$QvmyDRE76KuIQNY9XMeFtuj6E7Q/7NIdtJpy4gGORglivQ5jR6NDa';

  const ok = await bcrypt.compare(senhaDigitada, hashBanco);
  console.log(ok); // true ou false
})();

