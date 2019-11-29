/**
 * @Author: dushaobin <require dir all files>
 * @Date:   2017-03-21
 * @Email:  dushaobin@we.com
 * @Project: require dir all files
 * @Last modified by:   dushaobin
 * @Last modified time: 2017-03-23
 */


var fs = require('fs');
var glob = require('glob');
var pathModule = require('path');
var expressionName = "requireAll";
var rootPath = process.cwd();

function getRequireInfo(node, state, t) {
    if (node.arguments.length < 1) {
        console.log('requireAll need dir path');
        return;
    }
    var dirPath = node.arguments[0].value;

    const {filename} = state.file.opts;
    let {filenameRelative} = state.file.opts;

    if (!filenameRelative) {
        filenameRelative = filename.replace(rootPath, '');
    }
    const executionPath = pathModule.dirname(filenameRelative);
    let absolutePath = pathModule.join(rootPath, executionPath, dirPath);
    console.log('absolutePath:' + absolutePath)
    if (!fs.existsSync(absolutePath)) {
        console.log('requireAll path is not exist:' + dirPath, absolutePath);
        return;
    }

    var files = glob.sync(pathModule.join(absolutePath, '/**/*.*'));
    console.log('files:' + JSON.stringify(files))
    var requireList = [];
    var wrapObj = [];
    files.forEach(function (v, i) {
        if (!v) {
            return;
        }

        var rName = v.replace(absolutePath, '') // 去掉前面很长的路径，将子目录以及文件名 当做名字
        rName = rName.split(pathModule.sep).join('_')         // 替换路径分隔符 为 '_' 否则js运行错误
        rName = rName.split('.').join('_') // 替换'.'为 '_' 否则会被当成对象访问
        console.log('objectName:' + rName);
        console.log('fileName:' + v);
        var requireExp = t.callExpression(
            t.identifier('require'),
            [t.stringLiteral(v)]
        );
        var varReq = t.variableDeclarator(t.identifier(rName), requireExp);
        var express = t.variableDeclaration('const', [varReq]);
        wrapObj.push(t.objectProperty(t.identifier(rName), t.identifier(rName)));
        requireList.push(express);
    });
    return {
        requireList: requireList,
        wrapObj: wrapObj
    }
}

module.exports = function (babel) {
    const {types} = babel;
    return {
        visitor: {
            VariableDeclaration: function (path, state) {
                path.node.declarations.forEach(function (v, i) {
                    var initExp = v.init;
                    if (initExp && initExp.type === 'CallExpression' && initExp.callee.name === expressionName) {
                        var requireInfo = getRequireInfo(initExp, state, types);
                        var varWarp = types.variableDeclarator(v.id, types.objectExpression(requireInfo.wrapObj));
                        requireInfo.requireList.push(types.variableDeclaration(path.node.kind, [varWarp]));
                        path.replaceWithMultiple(requireInfo.requireList);
                        path.skip();
                    }
                });
            },
            CallExpression: function (path, state) {
                if (path.node.callee.name !== expressionName) {
                    return;
                }
                var requireInfo = getRequireInfo(path.node, state, types);
                console.log("requireInfo.requireList:" + JSON.stringify(requireInfo.requireList))
                path.replaceWithMultiple(requireInfo.requireList);
            }
        }
    }
}
