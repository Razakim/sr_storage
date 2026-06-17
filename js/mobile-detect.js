(function () {
  var MOBILE_MAX = 768;
  var isMobile = window.matchMedia('(max-width: ' + MOBILE_MAX + 'px)').matches;
  var path = window.location.pathname;
  var params = new URLSearchParams(window.location.search);
  var onMobileApp = path.indexOf('/mobile') !== -1;

  if (params.has('desktop')) {
    sessionStorage.setItem('r_storage_prefer_desktop', '1');
  }
  if (params.has('mobile')) {
    sessionStorage.removeItem('r_storage_prefer_desktop');
  }

  var preferDesktop = sessionStorage.getItem('r_storage_prefer_desktop') === '1';

  if (isMobile && !preferDesktop && !onMobileApp && !params.has('desktop')) {
    window.location.replace('/mobile/');
    return;
  }

  if (!isMobile && onMobileApp && !params.has('mobile')) {
    window.location.replace('/');
  }
})();
