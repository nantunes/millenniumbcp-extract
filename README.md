# millenniumbcp-extract

Extrai informação para CSV a partir do extracto combinado mensal do Millennium BCP.

Cria dois CSV:
- `do-<numero_de_conta>.csv` com os movimentos do *d*epósito à *o*rdem;
- `cred-<numero_de_emprestimo>.csv` com informação da prestação de *créd*ito à habitação.

Se os ficheiros já existirem acrescenta linhas aos mesmos. Não verifica se a informação já existe, pelo que duplicará linhas, nem as insere por ordem.

## Instalar
Clonar este repositório.

## Usar

O script processa o extracto em formato txt. Para o obter é necessário converter o pdf do extracto para texto. O utilitário http://linuxcommand.org/man_pages/ps2ascii1.html dá bons resultados.

```
ps2ascii EXTRATO\ COMBINADO\ 2016012.pdf extracto.txt
```

De seguida correr o script:
```
./index.js extracto.txt
```

O separador de campos dos CSVs gerados é `;`, mas pode ser mudado se necessário:
```
./index.js extracto.txt -s,
```
