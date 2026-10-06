// One NumPy card per act (GDD §5.7), shown after the act's last chapter: the library call that answers the
// act's question, what it does differently from the player's own function, and one line comparing the two.
// Every term used here has been earned by the end of its act.
import type { CardDef } from '../game/types';

export const NUMPY_CARDS: Record<number, CardDef> = {
  1: {
    kind: 'numpy', title: 'Arrows in NumPy',
    body: 'NumPy stores a vector as an **array** and does the part-by-part work for you, in compiled code.\n\n- `v + w` adds matching parts: your `add`.\n- `3 * v` scales every part: your `scale`.\n- `np.linalg.norm(v)` is the length: your `length`.\n\n**Yours and theirs:** the same arithmetic. NumPy runs it on a million arrows in the time your loop takes for a few thousand.',
    code: 'import numpy as np\nv = np.array([4, -1]); w = np.array([-1, 3])\nprint(v + w, 3 * v, np.linalg.norm(v))',
  },
  2: {
    kind: 'numpy', title: 'Measuring in NumPy',
    body: '- `v @ w` (or `np.dot(v, w)`) is the dot product: your `dot`.\n- `np.cross(a, b)` is the cross product: your `cross`.\n- `np.linalg.det(np.column_stack([a, b, c]))` is the scalar triple product of three struts: your `triple`.\n\n**Yours and theirs:** `np.linalg.det` does not use the triple-product formula. It uses a method you will meet in Act III, which stays accurate for large matrices.',
    code: 'import numpy as np\na, b = np.array([1, 0, 0]), np.array([0, 1, 0])\nprint(a @ b, np.cross(a, b))',
  },
  3: {
    kind: 'numpy', title: 'Solving in NumPy',
    body: '`np.linalg.solve(A, b)` answers "where do the planes meet?" in one call.\n\nIt does what your `row_echelon` and `back_sub` do, with one change: **partial pivoting**. Before clearing each column it swaps up the row with the largest entry, so rounding errors cannot grow. It calls LAPACK, a library tuned since the 1970s.\n\n**Yours and theirs:** `solve` refuses a system with no single answer (it raises an error). Your `solve` says **none**, **one** or **many**, and gives the directions of the many. When readings disagree and no exact answer exists, NumPy offers `np.linalg.lstsq`: the closest answer. You will meet the idea behind it in Act VIII.',
    code: 'import numpy as np\nA = np.array([[1., 1, 1], [1, -1, 2], [2, 1, -1]]); b = np.array([6., 5, 1])\nprint(np.linalg.solve(A, b))',
  },
  4: {
    kind: 'numpy', title: 'Moves in NumPy',
    body: '- `A @ x` applies a matrix to a vector: your `matvec`.\n- `A @ B` composes two moves: your `matmul`. `A.T` is the transpose.\n- `np.linalg.inv(A)` undoes a move: your `inverse`.\n- `np.linalg.det(A)`: your `det`, by the same idea: eliminate, multiply the pivots, flip the sign for each swap.\n\n**Yours and theirs:** in practice nobody computes `inv(A) @ b`. `np.linalg.solve(A, b)` is faster and loses fewer digits.',
    code: 'import numpy as np\nA = np.array([[1., -2], [1, -1]])\nprint(A @ np.array([1., 0]), np.linalg.det(A), np.linalg.inv(A))',
  },
  5: {
    kind: 'numpy', title: 'Rank in NumPy',
    body: '`np.linalg.matrix_rank(A)` counts the directions that survive.\n\nIt does **not** row-reduce. It measures how much the matrix stretches in each direction and counts the stretches bigger than a tiny **tolerance**. That is the two-decimal model in code form: a direction squeezed below the tolerance counts as flattened.\n\nNumPy has no null space function; SciPy does: `scipy.linalg.null_space(A)` and `scipy.linalg.orth(A)` return unit arrows for the null space and the column space, found the same way (from the stretches, with a tolerance).\n\n**Yours and theirs:** your `rank` counts pivots exactly. On measured data, the tolerance decides, so the same matrix can have rank 3 or rank 2 depending on how many decimals you trust.',
    code: 'import numpy as np\nfrom scipy.linalg import null_space\nC2 = np.array([[1., 0, 1], [0, 1, 1], [1, 1, 2]])\nprint(np.linalg.matrix_rank(C2), null_space(C2).ravel())',
  },
  6: {
    kind: 'numpy', title: 'Changing grids in NumPy',
    body: '- The coordinates of `x` in the grid with columns `B`: `np.linalg.solve(B, x)`, your `to_coords`.\n- Back to the ship grid: `B @ c`, your `from_coords`.\n- The same move written in the other grid: `np.linalg.inv(P) @ A @ P`.\n\n**Yours and theirs:** the same three lines. A change of grid is never a new kind of maths, only a solve and a multiply.',
    code: 'import numpy as np\nB = np.array([[2., 1], [1, 1]]); x = np.array([3., 2])\nprint(np.linalg.solve(B, x))',
  },
  7: {
    kind: 'numpy', title: 'Lines that hold, in NumPy',
    body: '`np.linalg.eig(A)` returns the stretches (eigenvalues) and the directions (eigenvectors, as columns).\n\nIt never writes down $\\det(A - \\lambda I) = 0$. For big matrices that polynomial is hopeless to solve accurately. Instead it repeats a clever version of your `power_iteration` on all directions at once.\n\n`np.linalg.matrix_power(A, 50)` uses repeated squaring, like your `mat_pow`.',
    code: 'import numpy as np\nA = np.array([[2., 1], [1, 2]])\nvals, vecs = np.linalg.eig(A)\nprint(vals, vecs)',
  },
  8: {
    kind: 'numpy', title: 'Closest points in NumPy',
    body: '- `np.linalg.lstsq(A, b, rcond=None)` finds the best fit: your `least_squares`.\n- `np.linalg.qr(A)` squares up a skewed grid: your `qr`.\n\n**Yours and theirs:** your Gram–Schmidt subtracts shadows one by one and can drift on nearly parallel columns. NumPy uses **reflections** (Householder), which keep the columns square to many more digits. And `lstsq` avoids $A^{\\mathsf T} A$, which would square how much errors in $b$ can grow.',
    code: 'import numpy as np\nA = np.array([[1., 0], [1, 1], [1, 2]]); b = np.array([6., 0, 0])\nprint(np.linalg.lstsq(A, b, rcond=None)[0])',
  },
  9: {
    kind: 'numpy', title: 'The shape of data, in NumPy',
    body: '- `np.linalg.svd(A)` returns $U$, the singular values, and $V^{\\mathsf T}$: your `svd`.\n- `np.linalg.eigh(S)` is `eig` for symmetric matrices: always real, always at right angles.\n- PCA in three lines: centre the data, take its SVD, keep the first $k$ columns of $V$.\n\n**Yours and theirs:** your `svd` goes through $A^{\\mathsf T} A$, which squares small singular values and can hide them. NumPy works on $A$ directly, which is how the Fold\'s thin direction (singular value 0.0013) stays visible.',
    code: 'import numpy as np\nX = np.random.default_rng(0).normal(size=(200, 3))\nXc = X - X.mean(axis=0)\nU, s, Vt = np.linalg.svd(Xc, full_matrices=False)\nprint(s)',
  },
};
