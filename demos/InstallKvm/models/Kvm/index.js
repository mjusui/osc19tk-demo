const Submarine=require('Submarine/v1.9.9-beta3');

module.exports=class extends Submarine {
  query(){
    return {
      cpu: String.raw`
        cat /proc/cpuinfo \
          |grep "vmx\|svm" \
        |wc -l
      `,

      kvm: String.raw`
        virsh version \
          > /dev/null

        echo $?
      `,
    };
  }
  test(stats){
    const kvm_supported=0 < stats.cpu*1;
    const kvm_installed=stats.kvm*1 == 0;
    return {
      kvm_installed: (
        kvm_supported
        && kvm_installed
      ) || !kvm_supported,
    };
  }
  command(){
    return String.raw`
      sudo apt-get \
        install -y \
          qemu-kvm \
          libvirt-daemon-system \
          libvirt-clients \
          bridge-utils
    `;
  }
}
