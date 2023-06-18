const fs = require("node:fs")
const codedown = require("codedown")
const path = require("node:path")

function main() {
    const docsRoot = __dirname

    const tmpdir = fs.mkdtempSync(".tmp_composable-indexes-docs-")

    const genTsDir = path.join(tmpdir, "ts")
    const genJsdocDir = path.join(tmpdir, "typedoc")

    const genTargetDir = path.join(docsRoot, 'gen')

    fs.mkdirSync(genTsDir, { recursive: true })
    fs.mkdirSync(genJsdocDir, { recursive: true })

    fs.readdirSync(path.join(docsRoot, 'src')).forEach(fname => {
        if(!fname.endsWith('.md')) {
            return
        }
    
        const inPath = path.join(docsRoot, 'src', fname)
    
        const contents = fs.readFileSync(inPath, 'utf-8')
        fs.writeFileSync(
            path.join(genTsDir, fname.replace(/\.md$/, '.ts')),
            extractTypescriptFromMarkdown(contents)
        )
    
        const moduleName = fname.replace(/\.md$/, '')
        fs.writeFileSync(
            path.join(genJsdocDir, fname.replace(/\.md$/, '.ts')),
            markdownToJSDoc(contents, moduleName)
        )
    })

    fs.mkdirSync(path.join(genTargetDir), { recursive: true })

    fs.rmSync(path.join(genTargetDir, 'ts'), { recursive: true, force: true })
    fs.renameSync(genTsDir, path.join(genTargetDir, 'ts'))

    fs.rmSync(path.join(genTargetDir, 'typedoc'), { recursive: true, force: true })
    fs.renameSync(genJsdocDir, path.join(genTargetDir, 'typedoc'))

    fs.rmdirSync(tmpdir, { recursive: true })

    console.log("Done.")
}

function extractTypescriptFromMarkdown(contents) {
    return codedown(contents, "typescript", "\n")
}

function markdownToJSDoc(contents, moduleName) {
    return `
/**
${contents}

@module ${moduleName}
*/
export {}
`
}

main()