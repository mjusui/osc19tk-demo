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

この記事ではSubmarine.jsのインストールと簡単な利用方法からはじめ、さらに応用編として、KVMサーバのリソース状況を管理して、あいているKVMに仮想マシンを自動で構築してくれるアロケーション機能を実装する方法を紹介します

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
つまりSubmarine.jsユーザはSubmarine.jsのクラスを拡張し、query関数を上書きしたことになります

ここではquery関数がreturn { ~ }で{ ~ }を結果として返すようになっています。この{ ~ }の中に{ <key>: <ShellScript> }というフォーマットでShellScriptを記述しておきます。すると、のちに紹介するcurrent関数を実行した際に、Submarine.jsが、query関数のreturn結果をターゲットのサーバにログインして実行します。実行した結果、標準出力に表示された文字列が、最終的なcurrent関数の結果として返されます

query関数がreturnする値はkeyとShellScriptの組み合わせを複数持つこともできます

query関数の定義の部分



