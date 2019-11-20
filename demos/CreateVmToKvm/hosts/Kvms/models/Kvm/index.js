const Submarine=require('Submarine/v1.9.9-beta2');


module.exports=class extends Submarine {
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
}

