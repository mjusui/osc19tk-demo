# Submarine.js誕生までの物語

こんなジレンマに陥ったことはありませんか?

```
このPlaybookを実行しても、このroleはスキップされるはず
Ansibleは冪等性を保証しているから、1度サーバに適用したroleはスキップされるはずなんだ……
でも、本当にスキップされるだろうか?
怖くて本番環境で試せない
```

```
ShellScriptなら一瞬で書ける、でもAnsibleで実現する方法が分からない
かといってShellScriptを冪等に書こうとするとif地獄に……
Ansibleはモジュール多すぎて欲しい機能が見つからない
しかもバージョンごとに挙動もモジュール名も違うだと!?
Shellで書くべきか、Ansibleに身を委ねるべきか……
```

```
このサーバは前に作ったこのroleを変数だけ変えて再利用して……
あれ? この変数も必要なんだっけ? この変数どこで使われてるんだ?
え? ディストリビューションごとに条件分岐している?!
なるほど分からん。ようし1から作り直しだ!
```

Ansibleを3年間利用した私は、この全部を経験しました


このような事態に陥る原因のほとんどは、Ansibleを利用するインフラエンジニアが、プログラミングの経験が乏しいために、無計画に無秩序にコードを書きつづけたことによるものです


AnsibleはYAML記法を採用し、豊富なモジュールを提供し、単純な条件分岐とループのみのでコードの実行順序を制御します。これは、プログラミング経験の少ないインフラエンジニアでもシンプルでとっつきやすいようなデザインです。しかし、それゆえにプログラミング言語としては非力な部分も多く、扱い方を間違えると悲惨な結果を招くことになります


昨今コンテナ技術やマイクロサービス、DevOpsやSREという新たな分野の流行に後押しされて、インフラエンジニアといえどもプログラミングのスキルが求められるようになってきています

そういった背景から、現代的な高級言語の特徴を持ち、より安全かつ柔軟な開発を実現する、新しい構成管理・自動化ツールである[Submarine.js](https://gitlab.com/mjusui/submarine)は開発されました


# この記事では

この記事ではSubmarine.jsのインストールと簡単な利用方法からはじめ、Submarine.jsの哲学、さらに応用編として、KVMサーバのリソース状況を管理して、あいているKVMに仮想マシンを自動で構築してくれるアロケーション機能を実装する方法を紹介します

Submarine.jsのベースとなる技術としてJavaScript(Node.js)がありますが、それを厳密に理解していなくても分かるように、詳細に説明していきます

ちなみにOpenStackなどのオーケストレーションツールで実現できることを、あえてSubmarine.jsで実装するのには理由があります。オーケストレーションツールは一般に、導入の際のシステム要件が厳しかったり、1度導入してしまうと、なかなか抜け出せなかったり、新しいバージョンを追いかけてアップグレードをするのが大変だったりと、こちらもこちらで、扱うエンジニアの力量が試されるツールだったりするのです

Submarine.jsを使うと、OpenStackよりかは導入が簡単で、自分たちで欲しい機能を追加したり、不具合を修正したり、別のツールと併用したりといったことができ、小回りの効く方法でオーケストレーションを実現できるようになります


# 目次

* インストールと環境構築
* まずはコードを書いて、動かしてみよう
* Submarine.jsはメンテナの目線でデザインされている
* モダンなJavaScript(Node.js)のパワーを活用しよう - 仮想マシンのアロケーション機能を実装する


# インストールと環境構築

まずはSubmarine.jsのインストールと環境構築をします

※この記事の手順は、Ubuntu18.04にて検証しています

## Node.jsをインストール

Submarine.jsはNode.jsで開発されているため、動作させるためにNode.jsのインストールが必要です

Node.jsはChromeなどのブラウザ上で動作するJavaScriptをサーバサイドでも実行できるようにした画期的なプログラミング言語です

[Node.jsのサイト](https://nodejs.org/en/download/)には、いつくかのインストール手順がありますが、Submarine.jsの[公式リポジトリ](https://gitlab.com/mjusui/submarine/tree/v1.1)に記載されているとおり、[NVMによるインストール](https://nodejs.org/en/download/package-manager/#nvm)をおすすめします

NVMとはNode Version Managerのことで、Node.jsの複数バージョンを簡単に切り替えられる便利なツールです  
RubyのrenvやPythonのpyenvに相当するツールですね

nvmの[githubページ](https://github.com/nvm-sh/nvm#install--update-script)を見るとcurlで一発でインストールできるようにしてくれてます

```
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.0/install.sh | bash
$ tail -n 4 .bashrc
$ . .bashrc
$ nvm --version
```


![nvm-install](https://github.com/mjusui/osc19tk-demo/blob/master/ospn/nvm-install-cropped.png)


nvmがインストールできたところで、次はいよいよNode.jsをインストールします

Submarine.jsはNode.jsの長期サポート版(LTS)である10.x系(記事執筆時)での動作が保証されていますので、今回は10.x系の最新版をインストールします

```
$ nvm install --lts
$ node --version
```

![node-install](https://github.com/mjusui/osc19tk-demo/blob/master/ospn/node-install-cropped.png)


## Submarine.jsのインストール

次にSubmarine.jsをインストールします  
まずはSubmarine.jsのコードを管理するプロジェクト用のディレクトリを作成します

```
$ mkdir project
```

そしてSubmarine.jsのソースコードをダウンロードします  
Node.jsのパッケージ管理ツールとしてはnpmやyarnがありますが、Submarine.jsは現時点では単にtarballを展開してインストールします  

Submarine.jsの執筆時点での最新バージョンはv1.1です

```
$ cd project
$ mkdir -p node_modules/v1.1
$ cd node_modules/v1.1
$ curl -LO https://gitlab.com/mjusui/submarine/-/archive/v1.1/submarine-v1.1.tar.gz
$ tar xzf submarine-v1.1.tar.gz
$ mv submarine-v1.1 Submarine
$ rm submarine-v1.1.tar.gz
$ node Submarine/src/HelloWorld
```

![submarine-isntall](https://github.com/mjusui/osc19tk-demo/blob/master/ospn/submarine-install-cropped.png)


これでSubmarine.jsが、使えるようになりました


# まずはコードを書いて、動かしてみよう

Submarine.jsがどういうものかはおいておいて、まずはコードを書いて、動かしてみます

JavaScriptやNode.jsの知識があると、ここで登場するコードを深く理解できますが、はじめはそれらの知識は必須ではありません  
Submarine.jsを利用していく中で、少しずつ身に付けていくことをおすすめします

それよりもむしろShellScriptを上手く書く技術があると、Submarine.jsのパワフルさを感じることができるでしょう

## サーバの状態を取得する

projectディレクトリに戻って、以下のファイルを作ってください


```MyHost.js
const Submarine=require('v1.1/Submarine');


const MyHost=class extends Submarine {

  query(){
    return {

      hostname: 'hostname -s',

    };
  }

}


const myhost=new MyHost({
  conn: 'sh',
});



myhost.current()
  .then(console.log)
  .catch(console.error);
```

そしてnodeコマンドで、コードを実行します

```
$ node MyHost.js
```

![my-host-js](https://github.com/mjusui/osc19tk-demo/blob/master/ospn/my-host-js-cropped.png)


query関数の中で定義したhostname -sがlocalhost上のshで実行され、その結果がJSON形式で表示されます

ではMyHost.jsの中身を、順を追って説明していきます

```MyHost.js
const Submarine=require('v1.1/Submarine');
```

まず一行目。JavaScriptを知らない方からすると、いきなり分からない文字が出てきますが、一つずつ分解してみます

```
const : JavaScriptで定数を宣言する際に、定数の前に書きます。constで定義された定数には、値を再代入できないという特徴があります
require('v1.1/Submarine') : 先ほどnode_modules/v1.1/Submarineに展開したtarballを読み込んでいます

```

const Submarine=require('v1.1/Submarine'); でSubmarineという定数にv1.1/Submarineから読み込んだものを代入するよ、という意味です
「これからSubmarine.jsのv1.1を使いますよ」と宣言している、という程度の理解で大丈夫です

そして次にMyHostという定数を宣言している部分

```
const MyHost=class extends Submarine {

~

}
```

class extends Submarine { ~ }というのは、Submarineクラスを拡張して使う、という意味です  

これは先ほどのrequire('v1.1/Submarine')の部分で、Submarineという定数の中にSubmarine.jsがあらかじめ用意したクラスが代入されているのですが、それに自分が使いたいようにアレンジを加えて使います、ということを宣言しているのです

クラスというのはオブジェクト指向プログラミングの世界の概念なのですが、ここでは単に「Submarine.jsがベースとなるコードをクラスという単位で、あらかじめ、まとめてくれている」というくらいの理解で大丈夫です

そして、いよいよクラスの中のShellコマンドが記述されたqueryという部分

```
  query(){
    return {

      hostname: 'hostname -s',

    };
  }
```

これはSubmarine.jsのクラスがあらかじめ持っているqueryという関数を、自分用にカスタマイズした部分です  
つまりこれは、Submarine.jsのクラスを拡張し、query関数を上書きしたことになります

ここではquery関数がreturn { ~ }で{ ~ }を結果として返すようになっています。この{ ~ }の中に{ [key]: [ShellScript] }というフォーマットでShellScriptを記述しておきます。すると、のちに紹介するcurrent関数を実行した際に、Submarine.jsが、query関数のreturn結果をターゲットのサーバにログインして実行します。実行した結果、標準出力に表示された文字列が、最終的なcurrent関数の結果として返されます

query関数がreturnする値はkeyとShellScriptの組み合わせを複数持つこともできます

```
  query(){
    return {

      hostname: 'hostname -s',

      ip_addrs: String.raw`

        ip -o -f inet a \
          |awk '{print $4}'

      `,

    };
  }
```

![my-host-2-js](https://github.com/mjusui/osc19tk-demo/blob/master/ospn/my-host-2-js-cropped.png)

上記のようにhostnameだけでなくip_addrsというkeyを追加し、ホストに設定されているIPアドレスの一覧を取得することもできます  
とにかく、この部分は、プログラマが参照したい値を取得するShellScriptを自由に書いていいのです

ここでString.raw\` ~ \`という書き方が新しく出てきました。これは\` ~ \`で囲われた文字列の中のエスケープ処理を無視して、生の文字列として扱うよ、という意味です  
これがあることによって、ShellScriptを文字列として記述しても、わずらわしいエスケープ処理に悩まされずに済むのです  
基本的に複数行にわたるコマンドを書くときには、必ずこれでくくることをおすすめします

また、複数のkeyとShellScriptを指定したことで、コンソール画面への出力結果のJSONにも、hostnameとip_addrsという2つのkeyと値が含まれるようになりました  
ip_addrsはホストのIPアドレスが2つ以上あり、コマンドの実行結果が複数行にわたったため、結果が改行で区切られ、配列に格納されています

これがSubmarine.jsの第一の機能queryです。サーバの状態を確認するコマンドを複数実行してJSON形式にしてくれます

コードの残りの部分についても、説明しましょう

```
const myhost=new MyHost({
  conn: 'sh',
});
```

今度は小文字のmyhost定数に、先ほど定義したclassをnewして代入しています

定数の名前は何でもよいのですが、このnew Class( ~ )というのは、定義したclassを元にオブジェクトを生成するという意味です  

このオブジェクトというのが、先ほども軽く登場したオブジェクト指向のオブジェクトなのですが、ここでは簡単に「定義したクラスを使いたいときにはnewする必要がある」ということだけ理解しておけばいいでしょう

new MyHost( ~ )の括弧の中で{ conn: 'sh' }と書かれていますが、これは「ローカルホストの/bin/shでコマンドを実行するよ」という意味です  
この他にも{ conn: 'bash' }(=ローカルホストの/bin/bash)や{ conn: 'ssh', host: 'target'}(=ターゲットサーバにssh)のように、実行先を指定できます

一度定義したクラスを、newする時に与える引数に応じて、実行先を変えることができるようになっています。これがオブジェクト指向の強みでもあります


そして最後

```
myhost.current()
  .then(console.log)
  .catch(console.error);
```

このcurrentという関数は、Submarine.jsを拡張したクラスのオブジェクトが持っている関数です。queryで定義されたコマンドを実行し、結果をJSON形式で返す働きをします。まさに「サーバの現在の状態(=current state)」を取得する関数なのです

.thenと.catchというのは、queryで定義されたコマンドが全て成功すればthenが呼び出され、1つでもコマンドが失敗すればcatchが呼び出される、という動きをします

console.logは引数を標準出力に表示するJavaScriptの機能で、console.errorはエラー出力に出力します。つまりコマンドが成功したら標準出力、エラーになったらエラー出力に表示する、という処理を、ここでは行っています


以上がSubmarine.js第一の機能であるqueryです。queryというのは、まさに「サーバの現在の状態(=current state)」を問い合わせ(=query)する関数なのです

注意点としては、このqueryはあくまで状態の取得をするための機能なので、サーバの状態に変更を加えるコマンドは記述すべきではないということです。例えば、このquery関数の中で、新しくファイルを作成したり、パッケージをインストールしたりするようなコマンドは、書いてはいけません(書けばサーバに変更を加えることができますが、Submarine.jsでは、これはqueryに書かず、のちに紹介するcommandやbatchという関数で書く、というルールを設けています)

## サーバの状態をテストする

query関数では、サーバの状態を取得することができました。今度は取得した状態をテストします  
Submarine.jsでは、サーバの現在の状態が、あるべき状態なのか、そうでないのかを調べるためにtestという関数が用意されています


```MyHost3.js
const Submarine=require('v1.1/Submarine');


const MyHost=class extends Submarine {

  query(){
    return {
      issue: 'cat /etc/issue.net',
    };
  }

  test(stats){
    return {
      ubuntu_is_18_04_3_lts: stats.issue === 'Ubuntu 18.04.3 LTS',
    };
  }

}


const myhost=new MyHost({
  conn: 'sh',
});



myhost.check()
  .then(console.log)
  .catch(console.error);
```


構造は、先ほどquery関数の例で紹介したコードとほぼ同じで、今回はquery関数に/etc/issue.nedの内容をcatする単純なコマンドが定義されています

そして新しくtestという関数の定義が加えられ、さらに、current関数の変わりにcheck関数を実行しています

このtestという関数が、query関数と同じくSubmarine.jsを拡張しています  
この関数の特性は、current関数の結果(すなわちquery関数で定義したコマンド群の結果)を第一引数として受け取り、それらを文字通りtestする関数となります

上のサンプルでは、queryでUbuntuのバージョン文字列を取得し、testで、その文字列が'Ubuntu 18.04.3 LTS'と一致することを確認しています

![my-host-js-3](https://github.com/mjusui/osc19tk-demo/blob/master/ospn/my-host-3-js-cropped.png)


このコードを実行すると、画像のようなJSON形式の値が表示されます  
1つずつ、中身を確認していきましょう

```
stats : current関数の結果
tests : test関数でreturnされた結果
good : testsのうちテストをパスした数(trueの数)
bad : testsのうちテストをパスできなかった数(falseの数)
total : テストの数
ok : テストが全てパスした場合はtrue、1つでもパスできなかった場合はfalse
```






