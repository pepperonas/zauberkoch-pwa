// Pre-paint theme/mode init — loaded synchronously in <head>, no FOUC.
(function () {
  var root = document.documentElement;
  var theme = localStorage.getItem('zk-theme');
  if (theme !== 'light' && theme !== 'dark') {
    theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', theme);
  var mode = localStorage.getItem('zk-mode');
  root.setAttribute('data-mode', mode === 'cocktail' ? 'cocktail' : 'kochen');
})();
