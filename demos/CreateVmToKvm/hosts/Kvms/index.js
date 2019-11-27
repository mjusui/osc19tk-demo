const Submarine=require('Submarine/v1.9.9-beta3');
const {
  Kvm,
  KvmFailed,
  KvmError,
}=require('models/Kvm');


const Kvms=Submarine.hosts(
  host => new Kvm({
    conn: 'ssh',
    host: host,
  }),

  'ubu1804-kvm001',
  'ubu1804-kvm002'
);

const KvmsFailed=Submarine.hosts(
  host => new KvmFailed({
    conn: 'ssh',
    host: host,
  }),

  'ubu1804-kvm001',
  'ubu1804-kvm001'
);


const KvmsError=Submarine.hosts(
  host => new KvmError({
    conn: 'ssh',
    host: host,
  }),

  'ubu1804-kvm001',
  'ubu1804-kvm001'
);



module.exports={
  Kvms: Kvms,
  KvmsFailed: KvmsFailed,
  KvmsError: KvmsError,
};




