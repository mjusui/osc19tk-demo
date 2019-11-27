const {
  Kvms,
  KvmsFailed,
  KvmsError,
}=require('hosts/Kvms');


const kvms=new Kvms();
const kvmsfailed=new KvmsFailed();
const kvmserror=new KvmsError();


const server1=kvms.communicate({
  pathname: '/kvms',
  html: '/kvms.html',
});


const server2=kvmsfailed.communicate({
  pathname: '/kvms-failed',
  html: '/kvms-failed.html',
});


const server3=kvmserror.communicate({
  pathname: '/kvms-error',
  html: '/kvms-error.html',
});

