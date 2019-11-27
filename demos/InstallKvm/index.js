const Kvms=require('hosts/Kvms');

const kvms=new Kvms();

kvms.correct()
  .then(console.log)
  .catch(console.error);
