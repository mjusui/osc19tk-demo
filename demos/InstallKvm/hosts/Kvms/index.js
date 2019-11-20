const Submarine=require('Submarine/v1.9.9-beta2');
const Kvm=require('models/Kvm');

module.exports=Submarine.hosts(
  host => new Kvm({
    conn: 'ssh',
    host: host,
  }),

  'ubu1804-kvm001',
  'ubu1804-kvm002'
);
