const Submarine=require('Submarine/v1.9.9-beta3');
const { Kvm }=require('models/Kvm');
const { Kvms }=require('hosts/Kvms');



module.exports=Submarine.collect(
  host => new Kvm({
    conn: 'ssh',
    host, host,
  }),

  { type: 'gen',
    coll: 'submarines',
    Class: Kvms, },
  { type: 'fil',
    coll: 'func',
    func: hosts => [
      hosts[Math.floor(
        Math.random() * hosts.length
      )]
    ], }
);







