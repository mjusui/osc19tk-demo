const Submarine=require('Submarine/v1.9.9-beta3');


const Kvm=class extends Submarine {
  format(stats){
    return Object.assign(
      stats, {
        vms: stats.vms === ''
          ? []
          : stats.vms
              .split('\n'),
      }
    );
  }
  query(){
    return {
      hostname: 'hostname -s',

      vms: String.raw`
        sudo virsh list \
          --name \
          --all \
        |grep -v "^\s*$"

        exit 0
      `,

      vcpus: String.raw`
        vcpus=0

        for vm in $(
          sudo virsh list \
            --name \
            --all \
          |grep -v "^\s"
        );do
          vcpus=$(( $vcpus + $(
            sudo virsh dumpxml \
              $vm \
            |grep "<vcpu .*</vcpu>" \
            |sed -e "s/^.*<vcpu .*>\([0-9]\)*<\/vcpu>$/\1/g"
          ) ))
        done

        echo $vcpus
      `,

      cpus: String.raw`
        sudo virsh nodeinfo \
        |grep "^CPU(s):" \
        |awk '{print $2}'
      `,


      vmemMB: String.raw`
        vmemMB=0

        for vm in $(
          sudo virsh list \
            --name \
            --all \
          |grep -v "^\s*$"
        );do
          vmemMB=$(( $vmemMB + $(
            virsh dumpxml \
              $vm \
            |grep "<memory .*unit='kB'.*</memory>$" \
            |sed -e "s/^.*>\([0-9]*\)<.+$/\1/g"
          ) / 1024 ))
        done

        echo $vmemMB
      `,

      memMB: String.raw`
        echo $(( $(
          virsh \
            nodememstats \
          |grep "^total\s*:" \
          |awk '{print $3}'
        ) / 1024 ))
      `,


      vvolGB: String.raw`
        vvolGB=0

        for vm in $(
          virsh list \
            --name \
            --all \
          |grep -v "^\s*$"
        );do
          vvolGB=$(( $vvolGB + $(
            sudo qemu-img info $(
              sudo virsh dumpxml \
                $vm \
              |grep "<source file='.*'/>" \
              |sed -e "s/source file='\(.*\)'\/>/\1/g"
            ) \
            |grep "^virtual size: " \
            |sed -e "s/^virtual size: .*\([0-9]*\) bytes/\1/g"
          ) / 1024 / 1024 /1024 ))
        done

        echo $vvolGB
     `,

     volGB: String.raw`
       echo $(( $(
         cd /var/lib/libvirt/images \
           && df -P . \
         |grep -v "^File" \
         |awk '{print $3 + $4}'
       ) / 1024 / 1024 ))
     `,



    }
  }  

  vmSpecs(){
    return {
      name: 'centos7-test001',
      vcpus: 1,
      vmemMB: 512,
      vvolGB: 12,
    };
  }
  test(stats){
    const vm=this.vmSpecs();

    return {
      cpu_available:
        stats.vcpus*1 + vm.vcpus < stats.cpus*1,
      mem_available:
        stats.vmemMB*1 + vm.vmemMB < stats.memMB*1,
      vol_available:
        stats.vvolGB*1 + vm.vvolGB < stats.volGB*1,
      vm_name_available:
        !stats.vms.includes(vm.name),
    };
  }

  batch(){
    const vm=this.vmSpecs();
    const dir='/var/submarine/isos';

    return String.raw`
      sudo mkdir -p \
        ${dir}/

      sudo test -r \
        ${dir}/CentOS-7-x86_64-Minimal-1908.iso \
      || curl -sL \
        -o ${dir}/CentOS-7-x86_64-Minimal-1908.iso \
      http://ftp.riken.jp/Linux/centos/7/isos/x86_64/CentOS-7-x86_64-Minimal-1908.iso
        
      sudo virt-install \
        --name ${vm.name} \
        --vcpu ${vm.vcpus} \
        --memory ${vm.vmemMB} \
        --disk size=${vm.vvolGB} \
        --noautoconsole \
        --nographics \
        --location \
          ${dir}/CentOS-7-x86_64-Minimal-1908.iso \
        --extra-args \
          'console=tty0 console=ttyS0,115200n8'
    `;
  }
}


const KvmFailed=class extends Kvm {
  test(){
    return {
      faild: false,
    };
  }
}


const KvmError=class extends Submarine {
  query(){
    return {
      error: 'exit 1',
    };
  }
}



module.exports={
  Kvm: Kvm,
  KvmFailed: KvmFailed,
  KvmError: KvmError,
}
