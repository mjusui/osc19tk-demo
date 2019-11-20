const Kvms=require('hosts/Kvms');


const kvms=new Kvms();


kvms.current()
  .then(r => r.map(
    r => r.stats
  )).then(console.log)
  .catch(console.error);

