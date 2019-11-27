const CreateVmToKvm=require('batches/CreateVmToKvm');


const create=new CreateVmToKvm();

create.call()
  .then(console.log)
  .catch(console.error);
