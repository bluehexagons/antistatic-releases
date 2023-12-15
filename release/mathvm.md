Features:
* near-total lack of syntax error checking
* does math
* more powerful than it had to be
* not powerful enough to do anything particularly useful

# literals, values
All literals are resolved to 64-bit floats.
`15` - just the number 15
`15%` - a special type of literal that returns a percentage of the `value` variable

# comments
`code #comment (until end of line)`

# variables
`var=5`
`var+=5`
`var++`
supports `+=` `-=` `*=` `/=` `%%=` `++` `--` `**=` (to power of)

`var++` and `var--` happen instantly (like `++var`) and can be used mid-statement

# ranges
`0~1` anywhere from 0 to 1

## plusminus
`+-0.5` either 0.5 or -0.5

# selections
`1|2|3|4` will be 1, 2, 3, or 4

# math
`+` `-` `*` `/` `%` `**` (`a` to power of `b`) `~` (range `[a, b)`))
order of operations and parenthesis work

# conditionals
0 = false
non-0 = true
1 is true result for boolean operators

supports `>` `<` `==` `!=` `>=` `<=` `&&` `||` `^` (exclusive or)

## ternary
`n ? true case`
`n ? true case : false case`
ternary terminates on statement end (semicolon or end of script)

# order of operations:
1. `~`
2. `**`
3. `*` `/` `%%` (%% = modulus, single % = percentage of `value`)
4. `+` `-`
5. `>` `<` `==` `!=` `>=` `<=`
6. everything else

# script parameters
begin script with:
parameter list: `[param1, param2, param3]`
number of arguments: `[n]`
variable arguments: `[...]`
read params like variables, but are read-only; writing to will write to a global variable
can also read args/params using pointers: `&1`, `&2`, `&variable`, etc
`&0` is always the number of arguments, arguments start at `&1`

would like to add function parameters later

# functions
`name() => { line1; line2; implicit return statement }`
lambdas
`name() => implicit return statement;` (note that it *must* end in a semicolon)
call functions like `name()`
parameters aren't supported... yet?

end statements with `;` or `,`

last statement implicitly returns

## anonymous functions
`() => { do; stuff; implicit return }`
anonymous lambda (note that it *must* end in a semicolon)
`() => implicit return;`
anonymous functions trigger instantly

other examples:
`() => i++ < 10 ? >() : i`
`> 10`

`() => { i++ < 10 ? >() : i} + 15`
`> 25`

`() => i++ < 10 ? >() : i; + 15`
`> 25`

## anonymous function call
`()`
calls currently-running function body again (including main script)

# loops
`() => d++ < 3 ? () : d`
`() => d++ < 3 ? () : d`
`i++ < 10 ? >() : i`

# TCO
`>tailcall()`
running a tail call obliterates the current stack frame
can include tailcall `>` anywhere a function is being run

# echo
`@echo@` will `console.log` the text inside
`@=variable@` will `console.log` the name and value of the variable
`@&n@` will `console.log` the result of resolving the pointer
`@&variable@` will `console.log` the result of resolving the variable pointer

# examples used in testing
`add()=>{q=q+1;q < 10 ? >add()};q=0;l=2* (2 * 3) + add()`
`> 12`

`add()=>{q=q+1;q < 10 ? add()};q=0;l=2* (2 * 3) + add(); q`
`> 10`

`add()=>{q++;q < 10 ? >add()};q=0;l=2* (2 * 3) + add(); q`
`> 10`

`q++;q < 10 ? () : q`
`> 10`

`()=>{q++;q < 10 ? >()}; q`
`> 10`
counts to 10

`runMath('[...] t = 0; i = 1; &0 > 0 ? ()=>{t += &i; i++ <= &0 ? () : t}', 1, 2, 3, 4)`
`> 10`
totals all arguments

formatted:
```
[...]
t = 0;
i = 1;
&0 > 0 ? ()=>{
  t += &i;
  i++ <= &0 ? () : t
}
```

# quirks
Anonymous lambdas are treated as an operand, despite ending in a semicolon. To terminate the statement, you need two semicolons.
`()=>15;3` -> parse error because of unexpected operand (3)
`()=>15;;3` -> OK, script returns 3

There are a lot of syntax errors that go unchecked and probably break everything
