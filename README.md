# C++ Practice Judge

Mini plataforma tipo LeetCode para practicar algoritmos y estructuras de datos en **C++17**. Incluye 33 ejercicios, editor Monaco con resaltado de C++, compilación con `g++`, casos visibles/ocultos y verdicts de ejecución.

## Incluye

- 33 problemas: recursión, Subset Sum, búsqueda binaria, ordenamiento lineal, Linked Lists, Stacks y Queues.
- Editor **Monaco** con syntax highlighting de C++.
- Comportamiento especial de `Enter`: la nueva línea comienza exactamente en la misma columna horizontal del cursor.
- Compilación real con `g++ -std=c++17`.
- Casos visibles con **Ejecutar** y evaluación completa con **Enviar**.
- Verdicts: `Accepted`, `Wrong Answer`, `Compile Error`, `Runtime Error`, `Time Limit Exceeded` y `Output Limit Exceeded`.
- Código guardado en `localStorage` por problema.
- Dockerfile y `render.yaml` listos para Render.

## Ejecutar localmente

Requisitos: Node.js 20+ y `g++`.

```bash
npm install
npm start
```

Abre `http://localhost:10000`.

## Subir a GitHub

Descomprime el proyecto y desde la carpeta raíz:

```bash
git init
git add .
git commit -m "Initial C++ Practice Judge"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

## Desplegar en Render

### Opción A: usando `render.yaml`

1. Sube este repositorio a GitHub.
2. En Render crea un nuevo **Blueprint**.
3. Conecta el repositorio.
4. Render detectará `render.yaml` y construirá el `Dockerfile`.
5. Espera a que `/api/health` responda correctamente.

### Opción B: Web Service manual

1. En Render selecciona **New > Web Service**.
2. Conecta el repositorio de GitHub.
3. Elige **Docker** como runtime/language.
4. Usa el `Dockerfile` de la raíz.
5. Despliega.

El servidor escucha en `0.0.0.0` y usa `process.env.PORT`, como requiere Render.

## Estructura

```text
cpp-practice-judge/
├── Dockerfile
├── render.yaml
├── package.json
├── README.md
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── src/
    ├── server.js
    ├── judge.js
    └── problems.json
```

## Seguridad importante

Este proyecto baja privilegios para compilar y ejecutar como `nobody`, y aplica límites de tiempo, memoria, procesos, tamaño de salida y concurrencia, pero **no constituye un sandbox de seguridad fuerte**. El código C++ enviado por el navegador se ejecuta dentro del mismo contenedor del servicio.

Está pensado para práctica personal, demostraciones o un salón con usuarios de confianza. Si lo vas a abrir al público para ejecutar código arbitrario de personas desconocidas, cambia el runner por un sandbox dedicado como Judge0/nsjail o separa la ejecución en infraestructura aislada. No guardes secretos sensibles en el contenedor mientras uses este runner local.

## Problemas incluidos

1. Factorial recursivo
2. Fibonacci recursivo
3. Brincos recursivos (1 o 2 escalones)
4. Suma de 1 hasta n
5. Potencia recursiva
6. Suma de dígitos
7. Invertir String
8. Conteo de 1s
9. esPalindromo recursivo
10. Máximo recursivo en vector
11. MCD recursivo — algoritmo de Euclides
12. Contar apariciones recursivamente en vector
13. Subset Sum
14. Búsqueda binaria clásica
15. Posición de inserción por búsqueda binaria
16. Ordenar 0 y 1 en O(n)
17. Ordenar 0, 1 y 2 en O(n)
18. Ordenar valores 0..k-1 en O(n+k)
19. Reverse Linked List
20. Merge Two Sorted Lists
21. Linked List Cycle
22. Middle of the Linked List
23. Remove Duplicates from Sorted List
24. Remove Linked List Elements
25. Delete Node in a Linked List
26. Intersection of Two Linked Lists
27. Palindrome Linked List
28. Remove Nth Node From End
29. Sumar elementos de Linked List
30. Valid Parentheses — Stack
31. Baseball Game — Stack
32. Number of Recent Calls — Queue
33. Time Needed to Buy Tickets — Queue
